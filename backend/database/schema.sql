-- ====================================================================
-- ExamSphere: Automated Exam Management System
-- Master Relational Database Schema (MySQL 8.0+)
-- Covers all 11 Functional Modules & Core Roles (Admin, Faculty, Student)
-- ====================================================================

CREATE DATABASE IF NOT EXISTS examsphere_db;
USE examsphere_db;

-- --------------------------------------------------------------------
-- 1. USERS & AUTHENTICATION TABLE (Module 1)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'FACULTY', 'STUDENT') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 2. COURSES MASTER TABLE (Module 2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    department VARCHAR(50) NOT NULL,
    semester INT DEFAULT 1,
    difficulty_level INT DEFAULT 3, -- 1 (Easy) to 5 (Hard) for Hardness-Optimized Scheduling
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 3. STUDENTS MASTER TABLE (Module 2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    enrollment_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    department VARCHAR(50) NOT NULL,
    semester INT DEFAULT 1,
    program VARCHAR(50) DEFAULT 'B.Tech',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- --------------------------------------------------------------------
-- 3b. STUDENT COURSE ENROLLMENTS TABLE (Module 2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    academic_year VARCHAR(20) DEFAULT '2025-2026',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_course (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 4. FACULTY MASTER TABLE (Module 2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    faculty_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    department VARCHAR(50) NOT NULL,
    designation VARCHAR(50) DEFAULT 'Assistant Professor',
    seniority_level INT DEFAULT 1, -- 1: Junior, 2: Associate, 3: Professor/Dean (For Hierarchical Balancing)
    max_duties INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- --------------------------------------------------------------------
-- 5. ROOMS MASTER TABLE (Module 2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(50) NOT NULL UNIQUE,
    building VARCHAR(50) NOT NULL,
    floor INT DEFAULT 1,
    capacity INT NOT NULL,
    rows_count INT NOT NULL DEFAULT 5,
    cols_count INT NOT NULL DEFAULT 6,
    has_camera BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 6. EXAMS TABLE (Module 3 - Member 2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    exam_name VARCHAR(120) NOT NULL,
    exam_type ENUM('QUIZ', 'MID_TERM', 'END_TERM') DEFAULT 'END_TERM',
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 180,
    status ENUM('DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 7. SEAT ALLOCATIONS TABLE (Module 4 - Member 2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seat_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    row_num INT NOT NULL,
    col_num INT NOT NULL,
    seat_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_exam_seat (exam_id, room_id, row_num, col_num),
    UNIQUE KEY uq_exam_student (exam_id, student_id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 8. INVIGILATION DUTIES TABLE (Module 5 - Member 2)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invigilation_duties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    room_id INT NOT NULL,
    faculty_id INT NOT NULL,
    status ENUM('ASSIGNED', 'CONFIRMED', 'ABSENT', 'SUBSTITUTED') DEFAULT 'ASSIGNED',
    substitute_faculty_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_exam_room_duty (exam_id, room_id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    FOREIGN KEY (substitute_faculty_id) REFERENCES faculty(id) ON DELETE SET NULL
);

-- --------------------------------------------------------------------
-- 9. ATTENDANCE RECORDS TABLE (Module 7 - Member 3)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    status ENUM('PRESENT', 'ABSENT', 'FLAGGED') DEFAULT 'PRESENT',
    verification_method ENUM('MANUAL', 'FACE_MATCH') DEFAULT 'MANUAL',
    face_confidence DECIMAL(5,2) NULL,
    photo_path VARCHAR(255) NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attendance (exam_id, student_id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 10. UNFAIR MEANS (UFM) REPORTS TABLE (Module 8 - Member 3)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ufm_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    invigilator_id INT NOT NULL,
    incident_details TEXT NOT NULL,
    evidence_photo_url VARCHAR(255) NULL,
    student_statement TEXT NULL,
    status ENUM('REPORTED', 'UNDER_REVIEW', 'ACTION_TAKEN', 'DISMISSED') DEFAULT 'REPORTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (invigilator_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 11. LIVE DOUBT REQUESTS TABLE (Module 8 - Member 3)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doubt_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    faculty_id INT NOT NULL, -- Subject faculty pinged
    question_text TEXT NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'VISITED', 'RESOLVED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 12. NOTIFICATIONS & ALERTS TABLE (Module 9 - Member 4)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    recipient_email VARCHAR(120) NOT NULL,
    type ENUM('STUDENT_SEAT', 'FACULTY_DUTY', 'EMERGENCY_ALERT') NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    delivery_status ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- --------------------------------------------------------------------
-- 13. AUDIT LOGS TABLE (Module 11 - Member 1)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ====================================================================
-- SEED INITIAL DEFAULT ADMIN USER (Password: admin123)
-- ====================================================================
-- Hash for 'admin123' generated with bcrypt (10 rounds):
-- $2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1q9V5xYp5Q/g9vN1l6qG7rZ9kO0a4a
INSERT IGNORE INTO users (id, name, email, password_hash, role)
VALUES (1, 'Exam Controller Admin', 'admin@examsphere.edu', '$2a$10$ZFq8iPrP2/7Uv0aTMgzNcur5xvjI5N7e5zKF6HLZG4Wi4MeMySlQm', 'ADMIN');
