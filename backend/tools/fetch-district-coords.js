const https = require('https');
const fs = require('fs');
const path = require('path');

// Target Districts for Hanoi (01) and Ho Chi Minh (79)
// Map: District Code -> Query String
const DISTRICTS = {
    // HANOI (Province 01)
    '001': 'Quan Ba Dinh, Ha Noi',
    '002': 'Quan Hoan Kiem, Ha Noi',
    '003': 'Quan Tay Ho, Ha Noi',
    '004': 'Quan Long Bien, Ha Noi',
    '005': 'Quan Cau Giay, Ha Noi',
    '006': 'Quan Dong Da, Ha Noi',
    '007': 'Quan Hai Ba Trung, Ha Noi',
    '008': 'Quan Hoang Mai, Ha Noi',
    '009': 'Quan Thanh Xuan, Ha Noi',
    '016': 'Huyen Soc Son, Ha Noi',
    '017': 'Huyen Dong Anh, Ha Noi',
    '018': 'Huyen Gia Lam, Ha Noi',
    '019': 'Quan Nam Tu Liem, Ha Noi',
    '020': 'Huyen Thanh Tri, Ha Noi',
    '021': 'Quan Bac Tu Liem, Ha Noi',
    '250': 'Huyen Me Linh, Ha Noi',
    '268': 'Quan Ha Dong, Ha Noi',
    '269': 'Thi xa Son Tay, Ha Noi',
    '271': 'Huyen Ba Vi, Ha Noi',
    '272': 'Huyen Phuc Tho, Ha Noi',
    '273': 'Huyen Dan Phuong, Ha Noi',
    '274': 'Huyen Hoai Duc, Ha Noi',
    '275': 'Huyen Quoc Oai, Ha Noi',
    '276': 'Huyen Thach That, Ha Noi',
    '277': 'Huyen Chuong My, Ha Noi',
    '278': 'Huyen Thanh Oai, Ha Noi',
    '279': 'Huyen Thuong Tin, Ha Noi',
    '280': 'Huyen Phu Xuyen, Ha Noi',
    '281': 'Huyen Ung Hoa, Ha Noi',
    '282': 'Huyen My Duc, Ha Noi',

    // HO CHI MINH (Province 79)
    '760': 'Quan 1, Ho Chi Minh',
    '761': 'Quan 12, Ho Chi Minh',
    '762': 'Quan Thu Duc, Ho Chi Minh', // Note: Thu Duc City now, but old code valid for map
    '763': 'Quan 9, Ho Chi Minh',
    '764': 'Quan Go Vap, Ho Chi Minh',
    '765': 'Quan Binh Thanh, Ho Chi Minh',
    '766': 'Quan Tan Binh, Ho Chi Minh',
    '767': 'Quan Tan Phu, Ho Chi Minh',
    '768': 'Quan Phu Nhuan, Ho Chi Minh',
    '769': 'Quan 2, Ho Chi Minh',
    '770': 'Quan 3, Ho Chi Minh',
    '771': 'Quan 10, Ho Chi Minh',
    '772': 'Quan 11, Ho Chi Minh',
    '773': 'Quan 4, Ho Chi Minh',
    '774': 'Quan 5, Ho Chi Minh',
    '775': 'Quan 6, Ho Chi Minh',
    '776': 'Quan 8, Ho Chi Minh',
    '777': 'Quan Binh Tan, Ho Chi Minh',
    '778': 'Quan 7, Ho Chi Minh',
    '783': 'Huyen Cu Chi, Ho Chi Minh',
    '784': 'Huyen Hoc Mon, Ho Chi Minh',
    '785': 'Huyen Binh Chanh, Ho Chi Minh',
    '786': 'Huyen Nha Be, Ho Chi Minh',
    '787': 'Huyen Can Gio, Ho Chi Minh'
};

const RESULTS = {};
const OUT_FILE = path.join(__dirname, '../src/database/seeds/district-coords.json');

const fetchCoord = (code, query) => {
    return new Promise((resolve) => {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        console.log(`Fetching ${query}...`);

        const req = https.get(url, {
            headers: { 'User-Agent': 'ShoppiSeeder/1.0' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && json.length > 0) {
                        RESULTS[code] = {
                            lat: parseFloat(json[0].lat),
                            lng: parseFloat(json[0].lon)
                        };
                        console.log(`  Found: ${RESULTS[code].lat}, ${RESULTS[code].lng}`);
                    } else {
                        console.log('  Not found');
                    }
                } catch (e) {
                    console.error('  Error parsing JSON');
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`  Request error: ${e.message}`);
            resolve();
        });
    });
};

const run = async () => {
    const codes = Object.keys(DISTRICTS);
    for (const code of codes) {
        await fetchCoord(code, DISTRICTS[code]);
        // Sleep 1.1s to respect rate limit
        await new Promise(r => setTimeout(r, 1100));
    }

    fs.writeFileSync(OUT_FILE, JSON.stringify(RESULTS, null, 2));
    console.log(`Saved ${Object.keys(RESULTS).length} district coordinates to ${OUT_FILE}`);
};

run();
