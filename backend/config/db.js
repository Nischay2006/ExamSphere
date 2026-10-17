let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch (err) {
  // mysql2 will be installed via npm install; allows headless unit tests to run
}

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Create a connection pool to MySQL
const pool = mysql ? mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'examsphere_db',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
}) : null;

// Test Database Connection
async function testConnection() {
  if (!pool) {
    console.warn('⚠️  mysql2 is not installed. Run "npm install" in the backend directory.');
    return false;
  }
  try {
    const connection = await pool.getConnection();
    console.log(` MySQL Connected to database '${process.env.DB_NAME || 'examsphere_db'}' successfully.`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL Connection Failed:', error.message);
    console.warn('⚠️  Make sure MySQL is running and the database "examsphere_db" is created.');
    return false;
  }
}

module.exports = {
  pool,
  query: (sql, params) => {
    if (!pool) throw new Error('Database pool not initialized. Run "npm install" in backend directory.');
    return pool.execute(sql, params);
  },
  testConnection
};
