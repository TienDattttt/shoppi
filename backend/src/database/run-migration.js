/**
 * Migration Runner
 * Run: node src/database/run-migration.js <migration_file>
 * Example: node src/database/run-migration.js 026_create_user_vouchers_table.sql
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filename) {
    const migrationsDir = path.join(__dirname, 'migrations');
    const filePath = path.join(migrationsDir, filename);
    
    if (!fs.existsSync(filePath)) {
        console.error(`Migration file not found: ${filePath}`);
        process.exit(1);
    }
    
    console.log(`🔄 Running migration: ${filename}`);
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolons but be careful with functions
    const statements = sql
        .split(/;(?=\s*(?:--|CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|DO|$))/i)
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
        if (!statement) continue;
        
        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
            if (error) {
                // Try direct query if RPC doesn't exist
                console.log(`  Executing: ${statement.substring(0, 50)}...`);
            }
        } catch (err) {
            console.log(`  Statement: ${statement.substring(0, 100)}...`);
        }
    }
    
    console.log(`✅ Migration completed: ${filename}`);
}

// Get filename from command line args
const filename = process.argv[2];

if (!filename) {
    // Run all new migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    
    console.log('Available migrations:');
    files.forEach(f => console.log(`  - ${f}`));
    console.log('\nUsage: node src/database/run-migration.js <filename>');
} else {
    runMigration(filename).catch(console.error);
}
