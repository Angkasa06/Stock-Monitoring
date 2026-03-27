const mysql2 = require('mysql2');
require('dotenv').config();

const pool = mysql2.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            process.env.DB_PORT     || 3306,
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  database:        process.env.DB_NAME     || 'stock_monitoring',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit:      0,
  charset:         'utf8mb4',
  multipleStatements: true,
});

const promisePool = pool.promise();

// Test koneksi saat startup
pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('❌ Koneksi database terputus.');
    } else if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('❌ Database terlalu banyak koneksi.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('❌ Koneksi database ditolak. Pastikan MySQL berjalan!');
    } else {
      console.error('❌ Error koneksi database:', err.message);
    }
    return;
  }
  if (connection) {
    connection.release();
    console.log('✅ Terhubung ke database MySQL!');
  }
});

module.exports = promisePool;
