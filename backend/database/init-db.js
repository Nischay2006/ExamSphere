const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function initDatabase() {
  console.log('\n======================================================');
  console.log('📦 Initializing ExamSphere MySQL Database...');
  console.log('======================================================\n');

  let connection;
  try {
    // Connect without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      multipleStatements: true
    });

    console.log(' Connected to MySQL server.');

    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log(' Executing schema.sql (Creating database, 13 tables & Admin seed)...');
    await connection.query(sql);

    console.log(' Database "examsphere_db" initialized successfully!');
    console.log(' Default Admin User seeded: admin@examsphere.edu / admin123\n');

    // Automatically seed sample master data if empty
    await connection.query('USE examsphere_db;');

    const [courses] = await connection.query('SELECT COUNT(*) as count FROM courses');
    if (courses[0].count === 0) {
      console.log('🌱 Seeding initial sample courses, rooms, faculty, and students...');

      // Seed Courses
      await connection.query(`
        INSERT IGNORE INTO courses (course_code, course_name, department, semester, difficulty_level) VALUES
        ('CSE3005', 'Software Engineering', 'CSE', 4, 3),
        ('CSE3002', 'Database Management Systems', 'CSE', 4, 4),
        ('ECE2001', 'Digital Electronics', 'ECE', 4, 4),
        ('ME1001', 'Thermodynamics', 'ME', 4, 5);
      `);

      // Seed Rooms
      await connection.query(`
        INSERT IGNORE INTO rooms (room_number, building, floor, capacity, rows_count, cols_count, has_camera) VALUES
        ('E2-101', 'E2', 1, 30, 5, 6, TRUE),
        ('E2-102', 'E2', 1, 30, 5, 6, TRUE),
        ('E2-201', 'E2', 2, 40, 5, 8, TRUE),
        ('AUD-HALL', 'Main Block', 1, 80, 8, 10, TRUE);
      `);

      // Seed Faculty
      await connection.query(`
        INSERT IGNORE INTO faculty (faculty_code, name, email, department, designation, seniority_level, max_duties) VALUES
        ('FAC101', 'Dr. Shilpa Mahajan', 'shilpa.mahajan@bmu.edu.in', 'CSE', 'Associate Professor', 2, 4),
        ('FAC102', 'Dr. Nishtha Phutela', 'nishtha.phutela@bmu.edu.in', 'CSE', 'Assistant Professor', 1, 5),
        ('FAC103', 'Dr. Harsh Taneja', 'harsh.taneja@bmu.edu.in', 'ECE', 'Associate Professor', 2, 4),
        ('FAC104', 'Dr. Sukhandeep Kaur', 'sukhandeep.kaur@bmu.edu.in', 'ME', 'Assistant Professor', 1, 5);
      `);

      // Seed Students
      await connection.query(`
        INSERT IGNORE INTO students (enrollment_no, name, email, department, semester, program) VALUES
        ('240101', 'Aarav Sharma', 'aarav.sharma@bmu.edu.in', 'CSE', 4, 'B.Tech'),
        ('240102', 'Ananya Verma', 'ananya.verma@bmu.edu.in', 'CSE', 4, 'B.Tech'),
        ('240103', 'Rohan Gupta', 'rohan.gupta@bmu.edu.in', 'ECE', 4, 'B.Tech'),
        ('240104', 'Pooja Patel', 'pooja.patel@bmu.edu.in', 'ECE', 4, 'B.Tech'),
        ('240105', 'Kabir Singh', 'kabir.singh@bmu.edu.in', 'ME', 4, 'B.Tech'),
        ('240106', 'Sneha Iyer', 'sneha.iyer@bmu.edu.in', 'ME', 4, 'B.Tech');
      `);

      console.log(' Sample master records seeded successfully!');
    }

    console.log('\n======================================================');
    console.log('🎯 ALL SET! You can now start the backend server:');
    console.log('   npm run dev');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
