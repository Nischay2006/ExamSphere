const { query } = require('../config/db');

async function seedCompleteDemoData() {
  console.log('Seeding rich demo data into examsphere_db...');

  // 1. Insert Courses
  const courses = [
    { code: 'CSE3005', name: 'Software Engineering', dept: 'CSE', sem: 4, diff: 3 },
    { code: 'ECE2001', name: 'Digital Electronics', dept: 'ECE', sem: 4, diff: 4 },
    { code: 'CSE3002', name: 'Database Management Systems', dept: 'CSE', sem: 4, diff: 4 },
    { code: 'ME1001', name: 'Thermodynamics', dept: 'ME', sem: 4, diff: 5 }
  ];

  for (const c of courses) {
    await query(
      `INSERT INTO courses (course_code, course_name, department, semester, difficulty_level)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE course_name = VALUES(course_name), department = VALUES(department), semester = VALUES(semester)`,
      [c.code, c.name, c.dept, c.sem, c.diff]
    );
  }
  console.log('Courses seeded.');

  // Fetch course IDs
  const [dbCourses] = await query('SELECT id, course_code FROM courses');
  const courseMap = {};
  dbCourses.forEach(c => { courseMap[c.course_code] = c.id; });

  // 2. Insert Rooms
  const rooms = [
    { num: 'E2-101', building: 'Block E', floor: 1, capacity: 30, rows: 5, cols: 6 },
    { num: 'E2-102', building: 'Block E', floor: 1, capacity: 30, rows: 5, cols: 6 },
    { num: 'E2-201', building: 'Block E', floor: 2, capacity: 40, rows: 5, cols: 8 },
    { num: 'AUD-HALL', building: 'Main Block', floor: 1, capacity: 80, rows: 8, cols: 10 }
  ];

  for (const r of rooms) {
    await query(
      `INSERT INTO rooms (room_number, building, floor, capacity, rows_count, cols_count, has_camera, is_available)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE)
       ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), rows_count = VALUES(rows_count), cols_count = VALUES(cols_count), is_available = TRUE`,
      [r.num, r.building, r.floor, r.capacity, r.rows, r.cols]
    );
  }
  console.log('Rooms seeded.');

  // 3. Insert Faculty
  const facultyList = [
    { code: 'FAC001', name: 'Dr. Rajesh Sharma', email: 'rajesh.sharma@bmu.edu.in', dept: 'CSE', desig: 'Professor', seniority: 3, max_duties: 6 },
    { code: 'FAC002', name: 'Dr. Priya Nair', email: 'priya.nair@bmu.edu.in', dept: 'ECE', desig: 'Associate Professor', seniority: 2, max_duties: 5 },
    { code: 'FAC003', name: 'Prof. Amit Verma', email: 'amit.verma@bmu.edu.in', dept: 'CSE', desig: 'Assistant Professor', seniority: 1, max_duties: 4 },
    { code: 'FAC004', name: 'Dr. Sunita Rao', email: 'sunita.rao@bmu.edu.in', dept: 'ME', desig: 'Assistant Professor', seniority: 1, max_duties: 4 }
  ];

  for (const f of facultyList) {
    await query(
      `INSERT INTO faculty (faculty_code, name, email, department, designation, seniority_level, max_duties)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department)`,
      [f.code, f.name, f.email, f.dept, f.desig, f.seniority, f.max_duties]
    );
  }
  console.log('Faculty seeded.');

  // 4. Insert Students: 12 in CSE (Sem 4) and 12 in ECE (Sem 4) + 6 in ME (Sem 4)
  const students = [
    // CSE Batch
    { enr: '240101', name: 'Aarav Sharma', email: 'aarav.sharma@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240102', name: 'Ananya Verma', email: 'ananya.verma@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240103', name: 'Rohan Gupta', email: 'rohan.gupta@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240104', name: 'Pooja Patel', email: 'pooja.patel@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240105', name: 'Aditya Roy', email: 'aditya.roy@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240106', name: 'Ishaan Joshi', email: 'ishaan.joshi@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240107', name: 'Meera Kapoor', email: 'meera.kapoor@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240108', name: 'Arjun Das', email: 'arjun.das@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240109', name: 'Kavya Pillai', email: 'kavya.pillai@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240110', name: 'Devansh Jain', email: 'devansh.jain@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240111', name: 'Tanvi Saxena', email: 'tanvi.saxena@bmu.edu.in', dept: 'CSE', sem: 4 },
    { enr: '240112', name: 'Karan Malhotra', email: 'karan.malhotra@bmu.edu.in', dept: 'CSE', sem: 4 },

    // ECE Batch
    { enr: '240201', name: 'Kabir Singh', email: 'kabir.singh@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240202', name: 'Sneha Iyer', email: 'sneha.iyer@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240203', name: 'Vikram Mehta', email: 'vikram.mehta@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240204', name: 'Diya Nair', email: 'diya.nair@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240205', name: 'Nikhil Chopra', email: 'nikhil.chopra@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240206', name: 'Riya Sen', email: 'riya.sen@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240207', name: 'Siddharth Rao', email: 'siddharth.rao@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240208', name: 'Anushka Banerjee', email: 'anushka.b@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240209', name: 'Varun Reddy', email: 'varun.reddy@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240210', name: 'Simran Kaur', email: 'simran.kaur@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240211', name: 'Yash Agarwal', email: 'yash.agarwal@bmu.edu.in', dept: 'ECE', sem: 4 },
    { enr: '240212', name: 'Shruti Mishra', email: 'shruti.mishra@bmu.edu.in', dept: 'ECE', sem: 4 },

    // ME Batch
    { enr: '240301', name: 'Manish Pandey', email: 'manish.pandey@bmu.edu.in', dept: 'ME', sem: 4 },
    { enr: '240302', name: 'Tara Deshmukh', email: 'tara.deshmukh@bmu.edu.in', dept: 'ME', sem: 4 },
    { enr: '240303', name: 'Gaurav Bhatia', email: 'gaurav.bhatia@bmu.edu.in', dept: 'ME', sem: 4 },
    { enr: '240304', name: 'Neha Chawla', email: 'neha.chawla@bmu.edu.in', dept: 'ME', sem: 4 }
  ];

  for (const s of students) {
    await query(
      `INSERT INTO students (enrollment_no, name, email, department, semester, program)
       VALUES (?, ?, ?, ?, ?, 'B.Tech')
       ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department), semester = VALUES(semester)`,
      [s.enr, s.name, s.email, s.dept, s.sem]
    );
  }
  console.log(`Seeded ${students.length} students.`);

  // 4b. Seed Student-Course Enrollments (Multiple subjects per student)
  const [allStudents] = await query('SELECT id, enrollment_no, department FROM students');
  for (const st of allStudents) {
    if (st.department === 'CSE') {
      // Enrolled in CSE3005 and CSE3002
      if (courseMap['CSE3005']) {
        await query('INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)', [st.id, courseMap['CSE3005']]);
      }
      if (courseMap['CSE3002']) {
        await query('INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)', [st.id, courseMap['CSE3002']]);
      }
    } else if (st.department === 'ECE') {
      // Enrolled in ECE2001 and elective CSE3005
      if (courseMap['ECE2001']) {
        await query('INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)', [st.id, courseMap['ECE2001']]);
      }
      if (courseMap['CSE3005']) {
        await query('INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)', [st.id, courseMap['CSE3005']]);
      }
    } else if (st.department === 'ME') {
      // Enrolled in ME1001 and elective CSE3002
      if (courseMap['ME1001']) {
        await query('INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)', [st.id, courseMap['ME1001']]);
      }
      if (courseMap['CSE3002']) {
        await query('INSERT IGNORE INTO student_courses (student_id, course_id) VALUES (?, ?)', [st.id, courseMap['CSE3002']]);
      }
    }
  }
  console.log('Seeded student-course enrollments.');

  // 5. Insert Exams
  const demoDate = new Date();
  demoDate.setDate(demoDate.getDate() + 5);
  const dateStr = demoDate.toISOString().split('T')[0];

  const exams = [
    {
      course_id: courseMap['CSE3005'],
      name: 'Software Engineering (CSE3005) End-Term',
      type: 'END_TERM',
      date: dateStr,
      start: '09:30:00',
      end: '12:30:00'
    },
    {
      course_id: courseMap['ECE2001'],
      name: 'Digital Electronics (ECE2001) End-Term',
      type: 'END_TERM',
      date: dateStr,
      start: '09:30:00',
      end: '12:30:00'
    },
    {
      course_id: courseMap['CSE3002'],
      name: 'Database Management Systems (CSE3002) Mid-Term',
      type: 'MID_TERM',
      date: dateStr,
      start: '14:00:00',
      end: '16:00:00'
    },
    {
      course_id: courseMap['ME1001'],
      name: 'Thermodynamics (ME1001) End-Term',
      type: 'END_TERM',
      date: dateStr,
      start: '14:00:00',
      end: '17:00:00'
    }
  ];

  for (const ex of exams) {
    if (!ex.course_id) continue;
    // Check if exam already exists
    const [existing] = await query('SELECT id FROM exams WHERE course_id = ? AND exam_name = ?', [ex.course_id, ex.name]);
    if (existing.length === 0) {
      await query(
        `INSERT INTO exams (course_id, exam_name, exam_type, exam_date, start_time, end_time, duration_minutes, status)
         VALUES (?, ?, ?, ?, ?, ?, 180, 'SCHEDULED')`,
        [ex.course_id, ex.name, ex.type, ex.date, ex.start, ex.end]
      );
    }
  }
  console.log('Exams seeded successfully.');

  return { success: true };
}

if (require.main === module) {
  seedCompleteDemoData()
    .then(() => {
      console.log('✅ COMPLETE DEMO DATA SEEDED SUCCESSFULLY!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ SEEDING FAILED:', err);
      process.exit(1);
    });
}

module.exports = { seedCompleteDemoData };
