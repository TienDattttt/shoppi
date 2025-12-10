/**
 * Seed script for shippers
 * Run: node src/database/seed-shippers.js
 */

const { supabaseAdmin } = require('../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

async function seedShippers() {
    console.log('Seeding shippers...');

    try {
        // Get shipper user
        const { data: shipperUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', 'shipper@shoppi.com')
            .single();

        if (!shipperUser) {
            console.log('Shipper user not found. Creating test users...');
        }

        // Create some test shipper users if needed
        const shipperUsers = [];
        
        if (shipperUser) {
            shipperUsers.push(shipperUser);
        }

        // Create additional test users for shippers
        const testShippers = [
            { email: 'shipper1@test.com', full_name: 'Nguyễn Văn Tài', phone: '0901234567' },
            { email: 'shipper2@test.com', full_name: 'Trần Minh Đức', phone: '0902345678' },
            { email: 'shipper3@test.com', full_name: 'Lê Hoàng Nam', phone: '0903456789' },
        ];

        for (const shipper of testShippers) {
            // Check if user exists
            const { data: existing } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', shipper.email)
                .single();

            if (existing) {
                shipperUsers.push(existing);
            } else {
                // Create user
                const { data: newUser, error: userError } = await supabaseAdmin
                    .from('users')
                    .insert({
                        id: uuidv4(),
                        email: shipper.email,
                        full_name: shipper.full_name,
                        phone: shipper.phone,
                        role: 'shipper',
                        password_hash: '$2b$10$example', // Placeholder
                        is_verified: true
                    })
                    .select()
                    .single();

                if (!userError && newUser) {
                    shipperUsers.push(newUser);
                }
            }
        }

        // Create shipper profiles
        const shipperProfiles = [
            {
                user_id: shipperUsers[0]?.id,
                vehicle_type: 'motorbike',
                vehicle_plate: '59-A1 12345',
                vehicle_brand: 'Honda',
                vehicle_model: 'Wave Alpha',
                status: 'active',
                is_online: true,
                is_available: true,
                working_district: 'Quận 1',
                working_city: 'TP. Hồ Chí Minh',
                total_deliveries: 156,
                successful_deliveries: 148,
                failed_deliveries: 8,
                avg_rating: 4.8,
                total_ratings: 120
            },
            {
                user_id: shipperUsers[1]?.id,
                vehicle_type: 'motorbike',
                vehicle_plate: '59-B2 67890',
                vehicle_brand: 'Yamaha',
                vehicle_model: 'Exciter',
                status: 'active',
                is_online: false,
                is_available: true,
                working_district: 'Quận 3',
                working_city: 'TP. Hồ Chí Minh',
                total_deliveries: 89,
                successful_deliveries: 85,
                failed_deliveries: 4,
                avg_rating: 4.6,
                total_ratings: 75
            },
            {
                user_id: shipperUsers[2]?.id,
                vehicle_type: 'car',
                vehicle_plate: '51-G 11111',
                vehicle_brand: 'Toyota',
                vehicle_model: 'Vios',
                status: 'pending',
                is_online: false,
                is_available: true,
                working_district: 'Quận 7',
                working_city: 'TP. Hồ Chí Minh',
                total_deliveries: 0,
                successful_deliveries: 0,
                failed_deliveries: 0,
                avg_rating: 0,
                total_ratings: 0
            },
            {
                user_id: shipperUsers[3]?.id,
                vehicle_type: 'motorbike',
                vehicle_plate: '59-C3 22222',
                vehicle_brand: 'Honda',
                vehicle_model: 'SH',
                status: 'suspended',
                is_online: false,
                is_available: false,
                working_district: 'Quận Bình Thạnh',
                working_city: 'TP. Hồ Chí Minh',
                total_deliveries: 45,
                successful_deliveries: 38,
                failed_deliveries: 7,
                avg_rating: 3.2,
                total_ratings: 30
            }
        ];

        for (const profile of shipperProfiles) {
            if (!profile.user_id) continue;

            // Check if shipper profile exists
            const { data: existing } = await supabaseAdmin
                .from('shippers')
                .select('id')
                .eq('user_id', profile.user_id)
                .single();

            if (!existing) {
                const { error } = await supabaseAdmin
                    .from('shippers')
                    .insert({
                        id: uuidv4(),
                        ...profile
                    });

                if (error) {
                    console.error('Error creating shipper:', error.message);
                } else {
                    console.log(`Created shipper profile for user ${profile.user_id}`);
                }
            } else {
                console.log(`Shipper profile already exists for user ${profile.user_id}`);
            }
        }

        console.log('Shippers seeded successfully!');
    } catch (error) {
        console.error('Seed error:', error);
    }
}

seedShippers();
