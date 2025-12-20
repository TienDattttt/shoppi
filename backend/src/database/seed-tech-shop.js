/**
 * Seed Tech Ecosystem
 * Seeds 6 realistic tech shops with distinct product lines.
 * Preserves location data (provinces, wards, etc.) and banners.
 * Clears and reseeds categories, shops, products, variants.
 * Cleans up users table (keeps only Admin + New Shop Owners).
 * 
 * Run with: node src/database/seed-tech-shop.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// ==========================================
// 1. DATA DEFINITIONS
// ==========================================

const CATEGORIES = [
    { name: 'Bàn phím cơ', slug: 'ban-phim-co', desc: 'Bàn phím cơ custom, pre-built các hãng Keychron, Logitech, Akko...' },
    { name: 'Chuột Gaming', slug: 'chuot-gaming', desc: 'Chuột chơi game không dây, siêu nhẹ, cảm biến cao cấp.' },
    { name: 'Tai nghe & Audio', slug: 'tai-nghe-audio', desc: 'Tai nghe chụp tai, loa máy tính, tai nghe True Wireless.' },
    { name: 'Màn hình', slug: 'man-hinh', desc: 'Màn hình đồ họa, gaming 144Hz+, màn hình cong.' },
    { name: 'Phụ kiện Setup', slug: 'phu-kien-setup', desc: 'Đèn màn hình, arm màn hình, thảm trải bàn, pegboard.' },
    { name: 'Sạc & Cáp', slug: 'sac-cap', desc: 'Củ sạc GaN, dây sạc nhanh, sạc dự phòng.' },
    { name: 'Hub & Kết nối', slug: 'hub-ket-noi', desc: 'Hub USB-C, Docking Station, Capture Card.' },
    { name: 'Ghế & Bàn', slug: 'ghe-ban', desc: 'Ghế công thái học, bàn nâng hạ thông minh.' },
];

const SHOPS = [
    {
        email: 'gearz@shoppi.com',
        name: 'GearZ Zone',
        slug: 'gearz-zone',
        desc: 'Thiên đường Gaming Gear chính hãng. Nhà phân phối ủy quyền của Logitech G, Razer, SteelSeries tại Việt Nam.',
        address: '252 Cach Mang Thang 8',
        district: 'District 3',
        city: 'Ho Chi Minh',
        logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400', // Gaming vibe
        products: [
            {
                cat: 'ban-phim-co',
                name: 'Bàn phím cơ Logitech G Pro X TKL Lightspeed',
                desc: 'Bàn phím gaming không dây chuyên nghiệp, switch tactle, LED RGB LIGHTSYNC rực rỡ.',
                price: 3800000, compare: 4200000,
                img: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?q=80&w=800'
            },
            {
                cat: 'chuot-gaming',
                name: 'Chuột Logitech G Pro X Superlight 2',
                desc: 'Chuột gaming không dây nhẹ nhất thế giới < 63g, cảm biến HERO 2 đột phá.',
                price: 2900000, compare: 3500000,
                img: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=800'
            },
            {
                cat: 'chuot-gaming',
                name: 'Razer DeathAdder V3 Pro Wireless',
                desc: 'Huyền thoại trở lại, thiết kế công thái học siêu nhẹ 64g, cảm biến Focus Pro 30K.',
                price: 3100000, compare: 3600000,
                img: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&q=80'
            },
            {
                cat: 'tai-nghe-audio',
                name: 'Tai nghe HyperX Cloud II Wireless',
                desc: 'Tai nghe gaming huyền thoại, âm thanh giả lập 7.1, đệm tai mút hoạt tính êm ái.',
                price: 2500000, compare: 3000000,
                img: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=800&q=80'
            }
        ]
    },
    {
        email: 'maclife@shoppi.com',
        name: 'MacLife Accessories',
        slug: 'maclife-accessories',
        desc: 'Chuyên phụ kiện cho hệ sinh thái Apple & Work From Home. Keychron, Satechi, HyperDrive.',
        address: '15 Tran Hung Dao',
        district: 'Hoan Kiem',
        city: 'Hanoi',
        logo: 'https://images.unsplash.com/photo-1531297461136-82lw9z0u?q=80&w=400', // Mac vibe
        products: [
            {
                cat: 'ban-phim-co',
                name: 'Keychron Q1 Pro Wireless Custom Mechanical Keyboard',
                desc: 'Bàn phím cơ vỏ nhôm CNC nguyên khối, kết nối Bluetooth, mạch xuôi, tương thích macOS.',
                price: 4500000, compare: 4900000,
                img: 'https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=800'
            },
            {
                cat: 'hub-ket-noi',
                name: 'Hub Satechi Type-C Multi-Port Adapter 4K',
                desc: 'Mở rộng kết nối cho MacBook: HDMI 4K, USB 3.0, khe thẻ nhớ SD/MicroSD, sạc PD.',
                price: 1800000, compare: 2100000,
                img: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?q=80&w=800'
            },
            {
                cat: 'phu-kien-setup',
                name: 'Giá đỡ Laptop Rain Design mStand',
                desc: 'Thiết kế nhôm nguyên khối, tản nhiệt tốt, nâng cao màn hình giúp bảo vệ cột sống.',
                price: 1200000, compare: 1500000,
                img: 'https://images.unsplash.com/photo-1527443060795-0402a18106c2?w=800&q=80'
            }
        ]
    },
    {
        email: 'audioverse@shoppi.com',
        name: 'AudioVerse',
        slug: 'audio-verse',
        desc: 'Thế giới âm thanh cao cấp. Loa Bluetooth, tai nghe chống ồn, thiết bị thu âm chuyên nghiệp.',
        address: '88 Nguyen Van Linh',
        district: 'Hai Chau',
        city: 'Da Nang',
        logo: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400',
        products: [
            {
                cat: 'tai-nghe-audio',
                name: 'Sony WH-1000XM5 Noise Canceling Headphones',
                desc: 'Tai nghe chống ồn đỉnh cao, thời lượng pin 30 giờ, đàm thoại cực rõ.',
                price: 6490000, compare: 6990000,
                img: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800'
            },
            {
                cat: 'tai-nghe-audio',
                name: 'Loa Marshall Stanmore III Bluetooth',
                desc: 'Thiết kế cổ điển đặc trưng, âm thanh chi tiết, kết nối Bluetooth 5.2.',
                price: 9500000, compare: 10500000,
                img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800'
            },
            {
                cat: 'tai-nghe-audio',
                name: 'Apple AirPods Pro 2 USB-C',
                desc: 'Chống ồn chủ động gấp 2 lần, chế độ xuyên âm thích ứng, hộp sạc MagSafe USB-C.',
                price: 5400000, compare: 6000000,
                img: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80'
            }
        ]
    },
    {
        cat: 'ViewPoint',
        email: 'viewpoint@shoppi.com',
        name: 'ViewPoint Displays',
        slug: 'viewpoint-displays',
        desc: 'Chuyên gia màn hình & giải pháp hiển thị. Màn hình đồ họa, gaming, arm màn hình Human Motion.',
        address: '102 Xa Lo Ha Noi',
        district: 'Thu Duc',
        city: 'Ho Chi Minh',
        logo: 'https://images.unsplash.com/photo-1547119957-632f856dd3d2?q=80&w=400',
        products: [
            {
                cat: 'man-hinh',
                name: 'Màn hình LG UltraGear 27GR95QE OLED 240Hz',
                desc: 'Màn hình OLED 27 inch 240Hz, phản hồi 0.03ms, màu sắc chuẩn điện ảnh.',
                price: 19900000, compare: 24000000,
                img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=800'
            },
            {
                cat: 'man-hinh',
                name: 'Dell UltraSharp U2723QE 4K IPS Black',
                desc: 'Công nghệ IPS Black đầu tiên, độ tương phản 2000:1, chuẩn màu 100% sRGB cho Designer.',
                price: 13500000, compare: 15000000,
                img: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?q=80&w=800'
            },
            {
                cat: 'phu-kien-setup',
                name: 'Tay đỡ màn hình Human Motion T9 Pro',
                desc: 'Arm màn hình chịu tải 20kg, piston trợ lực, thiết kế gaming hầm hố.',
                price: 1850000, compare: 2200000,
                img: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800'
            }
        ]
    },
    {
        email: 'powertech@shoppi.com',
        name: 'PowerTech Solutions',
        slug: 'powertech-solutions',
        desc: 'Giải pháp năng lượng toàn diện. Anker, Baseus, Ugreen, Cáp sạc siêu bền.',
        address: '56 Pho Hue',
        district: 'Hai Ba Trung',
        city: 'Hanoi',
        logo: 'https://images.unsplash.com/photo-1621379965042-8c1c49129e92?q=80&w=400', // Cable/Tech
        products: [
            {
                cat: 'sac-cap',
                name: 'Sạc dự phòng Anker 737 GaNPrime 140W',
                desc: 'Dung lượng 24000mAh, sạc nhanh 2 chiều 140W, màn hình thông minh.',
                price: 3200000, compare: 3800000,
                img: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80'
            },
            {
                cat: 'sac-cap',
                name: 'Củ sạc Ugreen Nexode 65W GaN',
                desc: 'Sạc nhanh 3 cổng (2C1A), nhỏ gọn, tương thích MacBook, iPhone, Samsung.',
                price: 650000, compare: 900000,
                img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=800'
            },
            {
                cat: 'hub-ket-noi',
                name: 'Cáp Thunderbolt 4 Pro Cable (1.8m)',
                desc: 'Truyền dữ liệu 40Gbps, sạc 100W, xuất hình 8K, bọc dù siêu bền.',
                price: 1200000, compare: 1500000,
                img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
            }
        ]
    },
    {
        email: 'setupholic@shoppi.com',
        name: 'Setup Holic',
        slug: 'setup-holic',
        desc: 'Đồ Decor bàn làm việc, đèn RGB, bảng Pegboard, những món đồ nhỏ xinh.',
        address: '12 District 7',
        district: 'District 7',
        city: 'Ho Chi Minh',
        logo: 'https://images.unsplash.com/photo-1493723843684-a632483acd0c?q=80&w=400',
        products: [
            {
                cat: 'phu-kien-setup',
                name: 'Đèn màn hình Yeelight Screenbar Pro',
                desc: 'Ánh sáng bảo vệ mắt, LED nền RGB tương thích Razer Chroma, điều khiển không dây.',
                price: 1800000, compare: 2200000,
                img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800' // Generic office
            },
            {
                cat: 'phu-kien-setup',
                name: 'Bảng Pegboard Gỗ Treo Tường',
                desc: 'Tổ chức không gian làm việc gọn gàng, bao gồm bộ phụ kiện móc treo.',
                price: 450000, compare: 600000,
                img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800' // creative
            },
            {
                cat: 'phu-kien-setup',
                name: 'Thảm da trải bàn Deskpad Leather',
                desc: 'Da PU cao cấp 2 mặt, chống nước, kích thước 80x40cm.',
                price: 250000, compare: 350000,
                img: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?q=80&w=800' // reused desk
            },
            {
                cat: 'ghe-ban',
                name: 'Ghế Công Thái Học Herman Miller Aeron',
                desc: 'Biểu tượng của ghế văn phòng, hỗ trợ cột sống tối đa, lưới Pellicle thoáng khí.',
                price: 35000000, compare: 45000000,
                img: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?q=80&w=800' // Generic chair
            }
        ]
    }
];

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

async function uploadImageFromUrl(url, bucket, name) {
    try {
        console.log(`      ⬇️  Downloading image for ${name}...`);
        const response = await fetch(url);
        if (!response.ok) {
            // Fallback for demo if fetch fails
            console.warn(`      ⚠️ Failed to fetch ${url}, using placeholder...`);
            return 'https://placehold.co/600x400';
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = `${name}_${Date.now()}.jpg`;
        console.log(`      ⬆️  Uploading ${fileName}...`);

        const { error } = await supabase.storage
            .from(bucket)
            .upload(fileName, buffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    } catch (e) {
        console.error(`      ❌ Image upload error: ${e.message}`);
        return 'https://placehold.co/600x400';
    }
}

// ==========================================
// 3. MAIN SEED FUNCTION
// ==========================================

async function seed() {
    console.log('🚀 Starting EXTENDED Tech Ecosystem Seed...\n');
    console.log('⚠️  NOTE: Provinces, Wards, Post Offices, Banners will be PRESERVED.');

    // ------------------------------------------
    // 3.1 CLEAR OLD DATA
    // ------------------------------------------
    console.log('\n🧹 Clearing old transactional data...');

    // Order matters for relational integrity
    const tablesToClear = [
        'cart_items', 'carts',
        'order_items', 'sub_orders', 'orders',
        'review_images', 'reviews',
        'product_images', 'product_variants', 'products',
        'shop_followers', 'shops',
        'categories',
    ];

    for (const table of tablesToClear) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error(`   ❌ Failed to clear ${table}: ${error.message}`);
        else console.log(`   ✅ Cleared ${table}`);
    }

    // List of User IDs to KEEP (Admin + Shop Owners)
    const keepUserIds = [];

    // ------------------------------------------
    // 3.2 ENSURE ADMIN EXISTS
    // ------------------------------------------
    console.log('\n👑 Checking Admin Account...');
    let { data: adminUser } = await supabase.from('users').select('id').eq('email', 'admin@shoppi.com').single();

    if (!adminUser) {
        console.log('   Creating Admin user...');
        const { data: newAdmin, error } = await supabase.from('users').insert({
            id: uuidv4(),
            email: 'admin@shoppi.com',
            password_hash: await bcrypt.hash('123456', 10),
            role: 'admin',
            full_name: 'Super Admin',
            status: 'active'
        }).select().single();

        if (error) console.error('   ❌ Failed to create admin:', error.message);
        else adminUser = newAdmin;
    }

    if (adminUser) {
        keepUserIds.push(adminUser.id);
        console.log('   ✅ Admin secured:', adminUser.id);
    }

    // ------------------------------------------
    // 3.3 SEED CATEGORIES
    // ------------------------------------------
    console.log('\n📂 Creating Categories...');
    const categoryMap = {}; // slug -> id

    for (const cat of CATEGORIES) {
        const catId = uuidv4();
        const { error } = await supabase.from('categories').insert({
            id: catId,
            name: cat.name,
            slug: cat.slug,
            description: cat.desc
        });

        if (error) {
            console.error(`   ❌ Failed to create category ${cat.name}: ${error.message}`);
        } else {
            categoryMap[cat.slug] = catId;
            console.log(`   ✅ Category: ${cat.name}`);
        }
    }

    // ------------------------------------------
    // 3.4 SEED SHOPS & PRODUCTS
    // ------------------------------------------
    console.log('\n🏪 Creating Shops & Products...');

    // Default password for all shop owners
    const passwordHash = await bcrypt.hash('123456', 10);

    for (const shop of SHOPS) {
        console.log(`\n   -------------------------------------------------`);
        console.log(`   🏗️  Building Shop: ${shop.name}`);

        // 1. Create/Get User
        let userId;
        const { data: existingUser } = await supabase.from('users').select('id').eq('email', shop.email).single();

        if (existingUser) {
            userId = existingUser.id;
            await supabase.from('users').update({
                password_hash: passwordHash,
                role: 'partner',
                full_name: `Manager ${shop.name}`
            }).eq('id', userId);
            console.log(`      👤 Updated User: ${shop.email}`);
        } else {
            userId = uuidv4();
            const { error: userErr } = await supabase.from('users').insert({
                id: userId,
                email: shop.email,
                password_hash: passwordHash,
                role: 'partner',
                full_name: `Manager ${shop.name}`,
                phone: `+849${Math.floor(10000000 + Math.random() * 90000000)}`,
                status: 'active'
            });
            if (userErr) {
                console.error(`      ❌ User error: ${userErr.message}`);
                continue;
            }
            console.log(`      👤 Created User: ${shop.email}`);
        }

        // Add to Keep List
        keepUserIds.push(userId);

        // 2. Upload Logo
        const logoUrl = await uploadImageFromUrl(shop.logo, 'shops', `${shop.slug}_logo`);

        // 3. Create Shop
        const shopId = uuidv4();
        const { error: shopErr } = await supabase.from('shops').insert({
            id: shopId,
            partner_id: userId,
            shop_name: shop.name,
            slug: shop.slug,
            description: shop.desc,
            phone: `+849${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: shop.email,
            address: shop.address,
            city: shop.city,
            district: shop.district,
            logo_url: logoUrl,
            status: 'active',
            avg_rating: 4.5 + (Math.random() * 0.5),
            review_count: Math.floor(Math.random() * 500) + 50,
            product_count: shop.products.length
        });

        if (shopErr) {
            console.error(`      ❌ Shop error: ${shopErr.message}`);
            continue;
        }
        console.log(`      ✅ Shop Created: ${shop.name}`);

        // 4. Create Products
        for (const prod of shop.products) {
            const catId = categoryMap[prod.cat];
            if (!catId) {
                console.warn(`      ⚠️  Category ${prod.cat} not found for ${prod.name}`);
                continue;
            }

            const prodId = uuidv4();
            // Convert Vietnamese to ASCII for slug
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
            const prodSlug = `${slugify(prod.name)}-${Math.floor(Math.random() * 1000)}`;

            // Upload Product Image
            const prodImgUrl = await uploadImageFromUrl(prod.img, 'products', prodSlug.substring(0, 50));

            // Insert Product
            const { error: prodErr } = await supabase.from('products').insert({
                id: prodId,
                shop_id: shopId,
                category_id: catId,
                name: prod.name,
                slug: prodSlug,
                description: prod.desc,
                base_price: prod.price,
                compare_at_price: prod.compare,
                status: 'active',
                total_sold: Math.floor(Math.random() * 500),
                avg_rating: 4.0 + (Math.random()),
                review_count: Math.floor(Math.random() * 100)
            });

            if (prodErr) {
                console.error(`      ❌ Product error: ${prodErr.message}`);
                continue;
            }

            // Insert Product Image
            await supabase.from('product_images').insert({
                product_id: prodId,
                url: prodImgUrl,
                is_primary: true,
                sort_order: 0
            });

            // Insert Default Variant
            const { error: variantErr } = await supabase.from('product_variants').insert({
                product_id: prodId,
                name: 'Default',
                price: prod.price,
                sku: `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`,
                quantity: 100,
                image_url: prodImgUrl,
                is_active: true
            });

            if (variantErr) {
                console.error(`      ❌ Variant Error: ${variantErr.message}`);
            }

            console.log(`      📦 Added: ${prod.name}`);
        }
    }

    // ------------------------------------------
    // 3.5 CLEANUP UNUSED USERS
    // ------------------------------------------
    console.log('\n🧹 Cleaning up unused users...');
    console.log(`   Keeping ${keepUserIds.length} users:`, keepUserIds);

    if (keepUserIds.length > 0) {
        const { error: deleteUserErr, count } = await supabase
            .from('users')
            .delete({ count: 'exact' })
            .not('id', 'in', `(${keepUserIds.join(',')})`); // Using filter syntax

        if (deleteUserErr) {
            console.error('   ❌ Failed to clean users:', deleteUserErr.message);
        } else {
            console.log(`   ✅ Deleted unused users.`);
        }
    }

    console.log('\n✨ SEED COMPLETED SUCCESSFULLY! ✨');
    console.log('All shops created with password: 123456');
    console.log('Admin account: admin@shoppi.com / 123456');
}

seed().catch(err => {
    console.error('Fatal Seed Error:', err);
    process.exit(1);
});
