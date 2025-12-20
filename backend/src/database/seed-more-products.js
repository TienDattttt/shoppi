/**
 * Seed More Products for Existing Shops
 * Adds more products to each shop based on their specialty
 * Run with: node src/database/seed-more-products.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Vietnamese slug helper
const slugify = (str) => {
    const map = {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'đ': 'd',
        'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y'
    };
    return str.toLowerCase()
        .split('')
        .map(char => map[char] || char)
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
};

// Additional products for each shop
const ADDITIONAL_PRODUCTS = {
    'GearZ Zone': [
        // Gaming Keyboards
        {
            cat: 'ban-phim-co',
            name: 'Bàn phím cơ SteelSeries Apex Pro TKL',
            desc: 'Switch OmniPoint 2.0 điều chỉnh được, OLED Smart Display, khung nhôm cao cấp.',
            price: 4200000, compare: 4800000,
            img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'
        },
        {
            cat: 'ban-phim-co',
            name: 'Bàn phím Razer Huntsman V2 Analog',
            desc: 'Switch Analog quang học, điều khiển như tay cầm, RGB Chroma per-key.',
            price: 5500000, compare: 6200000,
            img: 'https://images.unsplash.com/photo-1595044426077-d36d9236d54a?w=800&q=80'
        },
        // Gaming Mice
        {
            cat: 'chuot-gaming',
            name: 'Chuột Pulsar X2 Wireless',
            desc: 'Siêu nhẹ 52g, cảm biến PAW3395, pin 70 giờ, thiết kế đối xứng.',
            price: 2400000, compare: 2800000,
            img: 'https://images.unsplash.com/photo-1563297007-0686b7003af7?w=800&q=80'
        },
        {
            cat: 'chuot-gaming',
            name: 'Chuột Finalmouse UltralightX',
            desc: 'Nhẹ nhất thế giới 29g, vỏ magnesium, cảm biến Finalsensor.',
            price: 4500000, compare: 5200000,
            img: 'https://images.unsplash.com/photo-1629429408209-1f912961dbd8?w=800&q=80'
        },
        // Gaming Headsets
        {
            cat: 'tai-nghe-audio',
            name: 'Tai nghe SteelSeries Arctis Nova Pro Wireless',
            desc: 'Hi-Res Audio, ANC chủ động, pin kép có thể thay nóng.',
            price: 8500000, compare: 9500000,
            img: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80'
        },
        {
            cat: 'tai-nghe-audio',
            name: 'Tai nghe Logitech G Pro X 2 Lightspeed',
            desc: 'Driver Graphene 50mm, DTS Headphone:X 2.0, mic Blue VO!CE.',
            price: 5200000, compare: 5800000,
            img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80'
        }
    ],
    'MacLife Accessories': [
        // Keyboards for Mac
        {
            cat: 'ban-phim-co',
            name: 'Keychron K3 Pro Low Profile',
            desc: 'Bàn phím cơ siêu mỏng, switch Gateron, layout Mac, Bluetooth 5.1.',
            price: 2200000, compare: 2600000,
            img: 'https://images.unsplash.com/photo-1558050032-160f36233a07?w=800&q=80'
        },
        {
            cat: 'ban-phim-co',
            name: 'NuPhy Air75 V2 Wireless',
            desc: 'Low profile 75%, RGB underglow, tương thích macOS/Windows.',
            price: 2800000, compare: 3200000,
            img: 'https://images.unsplash.com/photo-1601445638532-3c6f6c3aa1d6?w=800&q=80'
        },
        // Hubs & Docks
        {
            cat: 'hub-ket-noi',
            name: 'CalDigit TS4 Thunderbolt 4 Dock',
            desc: '18 cổng kết nối, sạc 98W, 2x Thunderbolt 4, DisplayPort 1.4.',
            price: 8900000, compare: 9900000,
            img: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800&q=80'
        },
        {
            cat: 'hub-ket-noi',
            name: 'Anker 777 Thunderbolt Docking Station',
            desc: '12-in-1, sạc 90W, HDMI 4K@60Hz, Ethernet 1Gbps.',
            price: 6500000, compare: 7200000,
            img: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&q=80'
        },
        // Setup Accessories
        {
            cat: 'phu-kien-setup',
            name: 'Twelve South BookArc for MacBook',
            desc: 'Giá đỡ MacBook dọc, tiết kiệm không gian, nhôm nguyên khối.',
            price: 1500000, compare: 1800000,
            img: 'https://images.unsplash.com/photo-1527443060795-0402a18106c2?w=800&q=80'
        },
        {
            cat: 'phu-kien-setup',
            name: 'Grovemade Desk Shelf System',
            desc: 'Kệ gỗ walnut cao cấp, nâng màn hình, ngăn chứa đồ.',
            price: 3200000, compare: 3800000,
            img: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&q=80'
        }
    ],
    'AudioVerse': [
        // Headphones
        {
            cat: 'tai-nghe-audio',
            name: 'Bose QuietComfort Ultra Headphones',
            desc: 'Chống ồn thế hệ mới, Immersive Audio, CustomTune.',
            price: 9500000, compare: 10500000,
            img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80'
        },
        {
            cat: 'tai-nghe-audio',
            name: 'Sennheiser Momentum 4 Wireless',
            desc: 'Âm thanh audiophile, pin 60 giờ, ANC thích ứng.',
            price: 7900000, compare: 8900000,
            img: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80'
        },
        {
            cat: 'tai-nghe-audio',
            name: 'Audio-Technica ATH-M50xBT2',
            desc: 'Tai nghe studio không dây, driver 45mm, LDAC codec.',
            price: 4500000, compare: 5200000,
            img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80'
        },
        // Speakers
        {
            cat: 'tai-nghe-audio',
            name: 'Sonos Era 300',
            desc: 'Loa Dolby Atmos, âm thanh không gian 360°, WiFi 6.',
            price: 11500000, compare: 12500000,
            img: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80'
        },
        {
            cat: 'tai-nghe-audio',
            name: 'JBL Charge 5 Wi-Fi',
            desc: 'Loa di động, chống nước IP67, pin 20 giờ, AirPlay 2.',
            price: 4200000, compare: 4800000,
            img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80'
        },
        {
            cat: 'tai-nghe-audio',
            name: 'Bang & Olufsen Beosound A1 2nd Gen',
            desc: 'Loa Bluetooth cao cấp, Alexa tích hợp, chống nước IP67.',
            price: 6500000, compare: 7500000,
            img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'
        }
    ],
    'ViewPoint Displays': [
        // Monitors
        {
            cat: 'man-hinh',
            name: 'Samsung Odyssey OLED G9 49"',
            desc: 'Màn hình cong 49" OLED, 240Hz, 0.03ms, DQHD 5120x1440.',
            price: 35000000, compare: 42000000,
            img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80'
        },
        {
            cat: 'man-hinh',
            name: 'ASUS ProArt PA32UCG-K',
            desc: 'Màn hình 4K HDR 32", Mini LED, 120Hz, Thunderbolt 3.',
            price: 45000000, compare: 52000000,
            img: 'https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=800&q=80'
        },
        {
            cat: 'man-hinh',
            name: 'BenQ PD3220U Designer Monitor',
            desc: '4K IPS 32", Thunderbolt 3, 95% DCI-P3, KVM Switch.',
            price: 22000000, compare: 25000000,
            img: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80'
        },
        // Monitor Arms
        {
            cat: 'phu-kien-setup',
            name: 'Ergotron LX Desk Mount',
            desc: 'Arm màn hình cao cấp, chịu tải 11.3kg, xoay 360°.',
            price: 3500000, compare: 4200000,
            img: 'https://images.unsplash.com/photo-1547119957-637f8679db1e?w=800&q=80'
        },
        {
            cat: 'phu-kien-setup',
            name: 'Humanscale M8.1 Monitor Arm',
            desc: 'Thiết kế tối giản, cơ chế trọng lực, không cần điều chỉnh.',
            price: 5500000, compare: 6500000,
            img: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80'
        },
        {
            cat: 'phu-kien-setup',
            name: 'North Bayou F80 Gas Spring',
            desc: 'Arm màn hình giá rẻ, chịu tải 9kg, điều chỉnh linh hoạt.',
            price: 650000, compare: 850000,
            img: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80'
        }
    ],
    'PowerTech Solutions': [
        // Chargers
        {
            cat: 'sac-cap',
            name: 'Anker Prime 240W GaN Charger',
            desc: 'Sạc 4 cổng 240W, GaN II, màn hình LED, sạc laptop + điện thoại.',
            price: 2800000, compare: 3400000,
            img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&q=80'
        },
        {
            cat: 'sac-cap',
            name: 'Baseus GaN5 Pro 140W',
            desc: 'Sạc 3 cổng, PD 3.1, sạc MacBook Pro 16" trong 1.5 giờ.',
            price: 1200000, compare: 1500000,
            img: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80'
        },
        {
            cat: 'sac-cap',
            name: 'Belkin BoostCharge Pro 3-in-1',
            desc: 'Sạc không dây MagSafe + Apple Watch + AirPods, 15W.',
            price: 3500000, compare: 4000000,
            img: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=800&q=80'
        },
        // Power Banks
        {
            cat: 'sac-cap',
            name: 'Anker Prime 27650mAh Power Bank',
            desc: 'Dung lượng khủng, sạc 250W, màn hình thông minh.',
            price: 4500000, compare: 5200000,
            img: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80'
        },
        // Cables
        {
            cat: 'hub-ket-noi',
            name: 'Anker 765 USB-C to USB-C Cable 140W',
            desc: 'Cáp USB4, 140W PD, 40Gbps data, 8K video, 1.8m.',
            price: 850000, compare: 1100000,
            img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
        },
        {
            cat: 'hub-ket-noi',
            name: 'Ugreen USB-C Hub 10-in-1',
            desc: 'HDMI 4K, VGA, Ethernet, SD/TF, USB 3.0, PD 100W.',
            price: 1100000, compare: 1400000,
            img: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800&q=80'
        }
    ],
    'Setup Holic': [
        // Desk Accessories
        {
            cat: 'phu-kien-setup',
            name: 'BenQ ScreenBar Halo',
            desc: 'Đèn màn hình cao cấp, điều khiển không dây, backlight.',
            price: 3200000, compare: 3800000,
            img: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&q=80'
        },
        {
            cat: 'phu-kien-setup',
            name: 'Govee Glide Hexa Light Panels',
            desc: 'Đèn LED lục giác, RGBIC, đồng bộ nhạc, điều khiển app.',
            price: 2800000, compare: 3400000,
            img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
        },
        {
            cat: 'phu-kien-setup',
            name: 'Elgato Stream Deck MK.2',
            desc: '15 phím LCD tùy chỉnh, điều khiển stream, macro.',
            price: 3500000, compare: 4000000,
            img: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80'
        },
        {
            cat: 'phu-kien-setup',
            name: 'Orbitkey Desk Mat Large',
            desc: 'Thảm da vegan cao cấp, chống nước, 2 mặt sử dụng.',
            price: 1200000, compare: 1500000,
            img: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&q=80'
        },
        // Chairs & Desks
        {
            cat: 'ghe-ban',
            name: 'Secretlab TITAN Evo 2022',
            desc: 'Ghế gaming cao cấp, tựa lưng 4D, đệm memory foam.',
            price: 12000000, compare: 14000000,
            img: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&q=80'
        },
        {
            cat: 'ghe-ban',
            name: 'FlexiSpot E7 Standing Desk',
            desc: 'Bàn nâng hạ điện, 3 preset, chịu tải 125kg, mặt bàn 140x70.',
            price: 8500000, compare: 9800000,
            img: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&q=80'
        }
    ]
};

async function seedMoreProducts() {
    console.log('🚀 Seeding more products for existing shops...\n');

    // Get category map
    const { data: categories } = await supabase.from('categories').select('id, slug');
    const categoryMap = {};
    categories.forEach(c => categoryMap[c.slug] = c.id);
    console.log('📂 Found', Object.keys(categoryMap).length, 'categories');

    // Get shops
    const { data: shops } = await supabase.from('shops').select('id, shop_name');
    console.log('🏪 Found', shops.length, 'shops\n');

    let totalAdded = 0;

    for (const shop of shops) {
        const products = ADDITIONAL_PRODUCTS[shop.shop_name];
        if (!products) {
            console.log(`⏭️  No additional products for ${shop.shop_name}`);
            continue;
        }

        console.log(`\n📦 Adding products to ${shop.shop_name}...`);

        for (const prod of products) {
            const catId = categoryMap[prod.cat];
            if (!catId) {
                console.log(`   ⚠️ Category ${prod.cat} not found`);
                continue;
            }

            const prodId = uuidv4();
            const prodSlug = `${slugify(prod.name)}-${Math.floor(Math.random() * 1000)}`;

            // Insert product
            const { error: prodErr } = await supabase.from('products').insert({
                id: prodId,
                shop_id: shop.id,
                category_id: catId,
                name: prod.name,
                slug: prodSlug,
                description: prod.desc,
                base_price: prod.price,
                compare_at_price: prod.compare,
                status: 'active',
                total_sold: Math.floor(Math.random() * 300),
                avg_rating: 4.0 + Math.random(),
                review_count: Math.floor(Math.random() * 80)
            });

            if (prodErr) {
                console.log(`   ❌ Error: ${prod.name} - ${prodErr.message}`);
                continue;
            }

            // Insert product image
            await supabase.from('product_images').insert({
                product_id: prodId,
                url: prod.img,
                is_primary: true,
                sort_order: 0
            });

            // Insert default variant
            await supabase.from('product_variants').insert({
                product_id: prodId,
                name: 'Default',
                price: prod.price,
                sku: `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`,
                quantity: 50 + Math.floor(Math.random() * 100),
                image_url: prod.img,
                is_active: true
            });

            console.log(`   ✅ ${prod.name}`);
            totalAdded++;
        }
    }

    // Update shop product counts
    console.log('\n📊 Updating shop product counts...');
    for (const shop of shops) {
        const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shop.id);
        
        await supabase.from('shops').update({ product_count: count }).eq('id', shop.id);
    }

    console.log(`\n✨ Done! Added ${totalAdded} new products.`);
    console.log('💡 Run "node src/database/seeds/sync-elasticsearch.js" to update search index.');
}

seedMoreProducts().catch(console.error);
