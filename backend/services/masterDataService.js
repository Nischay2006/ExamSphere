const { query } = require('../config/db');

/**
 * Service encapsulating business logic & data operations for Master Entities
 * Adheres to Single Responsibility & High Cohesion
 */
class MasterDataService {
  // ===================== STUDENTS =====================
  async getAllStudents() {
    const [rows] = await query(`
      SELECT s.*, 
             COALESCE(GROUP_CONCAT(c.course_code ORDER BY c.course_code SEPARATOR ', '), 'None') AS enrolled_courses
      FROM students s
      LEFT JOIN student_courses sc ON s.id = sc.student_id
      LEFT JOIN courses c ON sc.course_id = c.id
      GROUP BY s.id
      ORDER BY s.enrollment_no ASC
    `);
    return rows;
  }

  async createStudent({ enrollment_no, name, email, department, semester, program }) {
    if (!enrollment_no || !name || !email || !department) {
      const err = new Error('enrollment_no, name, email, department are required.');
      err.statusCode = 400;
      throw err;
    }
    const [result] = await query(
      'INSERT INTO students (enrollment_no, name, email, department, semester, program) VALUES (?, ?, ?, ?, ?, ?)',
      [enrollment_no, name, email, department, semester || 1, program || 'B.Tech']
    );
    return result.insertId;
  }

  async updateStudent(id, { name, email, department, semester, program }) {
    await query(
      'UPDATE students SET name = ?, email = ?, department = ?, semester = ?, program = ? WHERE id = ?',
      [name, email, department, semester, program, id]
    );
    return true;
  }

  async deleteStudent(id) {
    await query('DELETE FROM students WHERE id = ?', [id]);
    return true;
  }

  // ===================== FACULTY =====================
  async getAllFaculty() {
    const [rows] = await query('SELECT * FROM faculty ORDER BY name ASC');
    return rows;
  }

  async createFaculty({ faculty_code, name, email, department, designation, seniority_level, max_duties }) {
    if (!faculty_code || !name || !email || !department) {
      const err = new Error('faculty_code, name, email, department are required.');
      err.statusCode = 400;
      throw err;
    }
    const [result] = await query(
      'INSERT INTO faculty (faculty_code, name, email, department, designation, seniority_level, max_duties) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [faculty_code, name, email, department, designation || 'Assistant Professor', seniority_level || 1, max_duties || 5]
    );
    return result.insertId;
  }

  async updateFaculty(id, { name, email, department, designation, seniority_level, max_duties }) {
    await query(
      'UPDATE faculty SET name = ?, email = ?, department = ?, designation = ?, seniority_level = ?, max_duties = ? WHERE id = ?',
      [name, email, department, designation, seniority_level, max_duties, id]
    );
    return true;
  }

  async deleteFaculty(id) {
    await query('DELETE FROM faculty WHERE id = ?', [id]);
    return true;
  }

  // ===================== COURSES =====================
  async getAllCourses() {
    const [rows] = await query('SELECT * FROM courses ORDER BY course_code ASC');
    return rows;
  }

  async createCourse({ course_code, course_name, department, semester, difficulty_level }) {
    if (!course_code || !course_name || !department) {
      const err = new Error('course_code, course_name, department are required.');
      err.statusCode = 400;
      throw err;
    }
    const [result] = await query(
      'INSERT INTO courses (course_code, course_name, department, semester, difficulty_level) VALUES (?, ?, ?, ?, ?)',
      [course_code, course_name, department, semester || 1, difficulty_level || 3]
    );
    return result.insertId;
  }

  async updateCourse(id, { course_name, department, semester, difficulty_level }) {
    await query(
      'UPDATE courses SET course_name = ?, department = ?, semester = ?, difficulty_level = ? WHERE id = ?',
      [course_name, department, semester, difficulty_level, id]
    );
    return true;
  }

  async deleteCourse(id) {
    await query('DELETE FROM courses WHERE id = ?', [id]);
    return true;
  }

  // ===================== ROOMS =====================
  async getAllRooms() {
    const [rows] = await query('SELECT * FROM rooms ORDER BY room_number ASC');
    return rows;
  }

  async createRoom({ room_number, building, floor, capacity, rows_count, cols_count, has_camera }) {
    if (!room_number || !building || !capacity) {
      const err = new Error('room_number, building, capacity are required.');
      err.statusCode = 400;
      throw err;
    }
    const rCount = rows_count || 5;
    const cCount = cols_count || Math.ceil(capacity / rCount);

    const [result] = await query(
      'INSERT INTO rooms (room_number, building, floor, capacity, rows_count, cols_count, has_camera) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [room_number, building, floor || 1, capacity, rCount, cCount, has_camera !== false]
    );
    return result.insertId;
  }

  async updateRoom(id, { room_number, building, floor, capacity, rows_count, cols_count, has_camera, is_available }) {
    await query(
      'UPDATE rooms SET room_number = ?, building = ?, floor = ?, capacity = ?, rows_count = ?, cols_count = ?, has_camera = ?, is_available = ? WHERE id = ?',
      [room_number, building, floor, capacity, rows_count, cols_count, has_camera, is_available, id]
    );
    return true;
  }

  async deleteRoom(id) {
    await query('DELETE FROM rooms WHERE id = ?', [id]);
    return true;
  }
}

module.exports = new MasterDataService();
