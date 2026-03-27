/**
 * Script helper: Generate bcrypt hash untuk password
 * Jalankan: node database/generate-hash.js
 * 
 * NOTE: Hash di schema.sql SUDAH di-generate untuk password: Admin123!
 */
const bcrypt = require('bcryptjs');

const passwords = [
    { label: 'Boss (01010301)', pass: 'Admin123!' },
    { label: 'Admin (01010201)', pass: 'Admin123!' },
    { label: 'Kasir (01010101)', pass: 'Admin123!' },
];

async function generateHashes() {
    console.log('\n====================================================');
    console.log('  STOCK MONITORING — Password Hash Generator');
    console.log('====================================================\n');

    for (const { label, pass } of passwords) {
        const hash = await bcrypt.hash(pass, 12);
        console.log(`🔑 ${label}`);
        console.log(`   Password : ${pass}`);
        console.log(`   Hash     : ${hash}`);
        console.log('');
    }

    console.log('====================================================');
    console.log('  Salin hash di atas ke dalam schema.sql jika');
    console.log('  Anda ingin mengganti password default.');
    console.log('====================================================\n');
}

generateHashes();
