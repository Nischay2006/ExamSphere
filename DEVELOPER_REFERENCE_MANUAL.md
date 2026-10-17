# ExamSphere: System Architecture & Developer Reference Manual

> **Purpose of this document:**  
> This document serves as the master engineering reference for the **ExamSphere** project. It outlines the architectural patterns, database schemas, coding conventions, current module completion status, and local setup instructions. Group members and AI coding assistants can reference this document to ensure that all subsequent feature development maintains strict architectural consistency, high cohesion, low coupling, and identical code conventions.

---

## 1. Project Overview & Scope Definition

**ExamSphere** is an automated university examination management platform engineered under Software Engineering (SE) best practices. It solves logistical overhead in timetable generation, conflict detection, room/seat allocation, invigilation duty balancing, and exam-day operations.

### Key Scope Clarification
* **Target Web Users:**
  1. **Administrators / Examination Branch:** Full control over master resource records, algorithms (scheduling, seating, duty balancing), and analytics dashboards.
  2. **Faculty / Invigilators:** Access assigned invigilation duties, digital camera attendance, live doubt routing, and digital Unfair Means (UFM) incident reporting.
* **Student Interaction Model:**
  * **There is NO student web dashboard or student login portal.**
  * Students interact with the system strictly as **asynchronous recipients** through automated email notifications (Module 9), receiving personalized exam schedules, seat coordinates, and dynamic printable Hall Tickets/Seating Slips.

---

## 2. Technology Stack & Environment

| Layer | Technology | Version / Configuration | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Node.js | v20+ / v24+ | Asynchronous event-driven server runtime |
| **API Framework** | Express.js | ^4.19.2 | RESTful route handling and middleware pipeline |
| **Database** | MySQL | 8.0+ | Relational data persistence with strict foreign key constraints |
| **Database Client** | `mysql2/promise` | ^3.9.7 | Connection pooling with parameterized SQL queries |
| **Security & Auth** | `bcryptjs` + `jsonwebtoken` | 10 Salt Rounds / 24h JWT | Password hashing and stateless Role-Based Access Control |
| **File Parsing** | `multer` + `csv-parser` | In-memory/temp streaming | Validated bulk ingestion for academic master records |
| **Frontend Framework** | React | 19.x (Vite bundler) | Component-based client dashboard |
| **Icons & Design** | Lucide React + Vanilla CSS | Design Tokens / HSL | Modern dark mode UI with glassmorphism (no Tailwind) |
| **Orchestration** | `concurrently` | ^9.1.2 | One-command monorepo development runner |

---

## 3. Official 10-Module System Matrix

| No. | Module Name | Main Functionalities | Status |
| :---: | :--- | :--- | :---: |
| **1** | **Authentication & Role Management** | Login, JWT authentication, role-based access for Admin, Faculty, Invigilator, and Student. | **COMPLETED & LIVE** |
| **2** | **Resource & Data Management** | Student, faculty, course, and room CRUD operations; CSV bulk upload and data validation. | **COMPLETED & LIVE** |
| **3** | **Exam Scheduling** | Create examinations, generate timetables, and detect scheduling conflicts. | *Pending* |
| **4** | **Smart Room & Seating Allocation** | Allocate rooms based on capacity, assign student seats, and apply anti-cheating seating rules. | **COMPLETED & LIVE** |
| **5** | **Faculty Duty & Workload Management** | Assign invigilators to rooms and time slots, check faculty availability, and balance workloads. | *Pending* |
| **6** | **Faculty Portal & Doubt Resolution** | Allow faculty to view examination schedules and assigned duties, receive student doubt requests, and respond to them. | *Pending* |
| **7** | **Invigilator Portal & Attendance** | View assigned duties, verify student identities, perform camera-based face matching, and record attendance. | *Pending* |
| **8** | **Exam-Day Incident Management** | Submit Unfair Means (UFM) reports with photo evidence and written statements, manage incident records, and find substitute invigilators. | *Pending* |
| **9** | **Notification & Alert System** | Send student examination and seating emails, faculty duty notifications, and emergency alerts; track notification status. | *Pending* |
| **10** | **Analytics & Reports** | Generate attendance statistics, room utilization reports, faculty workload reports, and UFM summaries for administrators. | *Pending* |

---

## 4. Software Architecture & Design Patterns

To meet academic evaluation standards (CO1, CO2, CO3 in Software Engineering), the project strictly rejects the "Fat Controller" anti-pattern in favor of a **3-Tier Layered Architecture**:

```text
[HTTP Request]
       │
       ▼
[Route Definition]       (backend/routes/*.js)
       │
       ▼
[Middleware Layer]       (JWT auth, Role check, Multer upload, Audit logger)
       │
       ▼
[Thin Controller]        (backend/controllers/*.js) -> Validates input, delegates, returns HTTP status
       │
       ▼
[Service Layer]          (backend/services/*.js)    -> Pure business logic & algorithm computation
       │
       ▼
[Database Layer]         (backend/config/db.js)     -> Parameterized MySQL queries via connection pool
```

### Design Patterns Used
1. **Strategy Pattern (`backend/services/csvIngestionService.js` & `backend/services/seatingService.js`):**  
   * CSV parsing uses an extensible ingestion strategy dictionary (`INGESTION_STRATEGIES[entityType]`).
   * Seating allocation engine supports pluggable anti-cheating strategies (`MULTI_COURSE_INTERLEAVED`, `ALTERNATE_COLUMNS` [row-by-row alternate column seating: R1: C1, C3, C5 → R2: C1, C3, C5... with even buffer aisles], `SEQUENTIAL`).
2. **Layered Decoupling:**  
   Services return plain JavaScript objects or throw standard `Error` objects with `.statusCode`. Controllers catch these and format HTTP responses. Services do not touch `req` or `res`.
3. **Component Decomposition (Frontend):**  
   The UI avoids massive monolithic components. Specific responsibilities are broken into isolated components (e.g., `StudentsTable.jsx`, `SeatingAllocationView.jsx`, `StatsGrid.jsx`).

---

## 5. Repository File Structure

```text
ExamSphere/
├── .gitignore                           # Excludes backend/.env, node_modules, build outputs
├── package.json                         # Root monorepo script coordinator (concurrently)
├── DEVELOPER_REFERENCE_MANUAL.md        # Master Engineering & Architecture Manual
│
├── backend/
│   ├── .env                             # PRIVATE: Local DB credentials & JWT secret (DO NOT COMMIT)
│   ├── .env.example                     # PUBLIC: Safe template for team members
│   ├── package.json                     # Backend dependencies & test scripts
│   ├── server.js                        # Express app initialization, static routes, health check
│   │
│   ├── config/
│   │   └── db.js                        # MySQL connection pool configuration (mysql2/promise)
│   │
│   ├── database/
│   │   └── schema.sql                   # Master MySQL DDL: 13 tables + initial admin seed
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js            # JWT verification & RBAC check (verifyToken, requireRole)
│   │   ├── uploadMiddleware.js          # Multer memory/disk file configuration (.csv check)
│   │   └── auditMiddleware.js           # Automatic audit logger for mutating HTTP methods
│   │
│   ├── controllers/
│   │   ├── authController.js            # Module 1: register, login, getMe
│   │   ├── masterDataController.js      # Module 2: students, faculty, courses, rooms CRUD
│   │   ├── seatingController.js         # Module 4: seating allocations, 2D matrix, clear
│   │   └── auditController.js           # Audit logs & system-summary
│   │
│   ├── services/
│   │   ├── authService.js               # Module 1: bcrypt hashing, JWT signing
│   │   ├── masterDataService.js         # Module 2: entity queries, validation, upserts
│   │   ├── csvIngestionService.js       # Module 2: Strategy Pattern bulk CSV ingestion
│   │   └── seatingService.js            # Module 4: Anti-cheating interleaving & capacity sizing
│   │
│   ├── routes/
│   │   ├── authRoutes.js                # /api/auth routes
│   │   ├── masterDataRoutes.js          # /api/master-data routes (Admin protected)
│   │   ├── seatingRoutes.js             # /api/allocations routes (Admin/Faculty protected)
│   │   └── auditRoutes.js               # /api/admin routes (Admin protected)
│   │
│   ├── utils/
│   │   ├── passwordHelper.js            # bcrypt.hash & bcrypt.compare utility functions
│   │   └── csvParser.js                 # Stream reader validating required columns
│   │
│   ├── templates/                       # Valid CSV templates for testing bulk uploads
│   │   ├── students_template.csv
│   │   ├── faculty_template.csv
│   │   ├── courses_template.csv
│   │   └── rooms_template.csv
│   │
│   ├── uploads/                         # Temporary disk staging (.gitkeep tracked)
│   │
│   └── tests/
│       ├── test-auth-and-masterdata.js  # Headless Unit Tests: Auth, JWT, CSV streaming (5 tests)
│       └── test-seating-engine.js       # Headless Unit Tests: Seating algorithms & matrices (5 tests)
│
└── frontend/
    ├── package.json                     # React 19, Vite, Lucide React
    ├── vite.config.js                   # Vite dev server configuration
    ├── index.html                       # Single Page App mount point
    │
    └── src/
        ├── index.css                    # Master Design System (CSS tokens, dark mode, glassmorphism)
        ├── main.jsx                     # React DOM entry point
        ├── App.jsx                      # App shell: role state, active tabs, modal controllers
        ├── api.js                       # Centralized HTTP client: auto token injection & error handling
        │
        └── components/
            ├── Navbar.jsx               # Header with backend pulse indicator, profile & logout
            ├── StatsGrid.jsx            # 5 summary cards showing live aggregate database counts
            ├── MasterDataView.jsx       # Module 2: Resource & Data Management orchestrator
            ├── SeatingAllocationView.jsx# Module 4: 2D Classroom Visualizer & Seating Generator
            ├── AuditLogsView.jsx        # System audit trail table
            ├── DevSandboxView.jsx       # System Modules Hub listing all 10 modules & live statuses
            ├── LoginModal.jsx           # Sign-in modal with 1-click admin demo autofill
            │
            └── master-data/             # Decomposed entity tables (Single Responsibility)
                ├── StudentsTable.jsx
                ├── FacultyTable.jsx
                ├── CoursesTable.jsx
                └── RoomsTable.jsx
```

---

## 6. Coding Standards & Conventions for Future Modules

Any teammate or AI coding assistant writing code for ExamSphere must follow these rules:

### A. Backend Standards (Express + MySQL)
1. **Thin Controller Pattern:**
   Controllers must NEVER write raw SQL queries. Controllers only extract inputs, call the corresponding service, and return standard JSON responses:
   ```javascript
   // Standard Controller Method
   async function scheduleExam(req, res) {
     try {
       const result = await schedulingService.generateTimetable(req.body);
       return res.status(200).json({ success: true, data: result });
     } catch (err) {
       return res.status(err.statusCode || 500).json({ success: false, message: err.message });
     }
   }
   ```
2. **Standard API Response Format:**
   All API endpoints must return standardized JSON:
   ```json
   {
     "success": true,
     "message": "Optional human-readable confirmation",
     "data": {}
   }
   ```
   Or on error:
   ```json
   {
     "success": false,
     "message": "Detailed error explanation"
   }
   ```
3. **Parameterized SQL Queries:**
   Never concatenate SQL strings. Always use `?` placeholders via `query(sql, params)` to prevent SQL Injection:
   ```javascript
   // CORRECT
   await query('SELECT * FROM exams WHERE course_id = ? AND exam_date = ?', [courseId, examDate]);
   // FORBIDDEN
   await query(`SELECT * FROM exams WHERE course_id = ${courseId}`);
   ```
4. **Environment Isolation:**
   Always load `.env` with explicit pathing:
   ```javascript
   require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
   ```

### B. Frontend Standards (React 19)
1. **Shared Design System:**
   Do not write inline hex colors or custom CSS frameworks. Use predefined CSS variables from `frontend/src/index.css`:
   - Backgrounds: `var(--bg-primary)`, `var(--bg-card)`, `var(--bg-glass)`
   - Accents: `var(--primary)`, `var(--accent-emerald)`, `var(--accent-cyan)`, `var(--accent-amber)`, `var(--accent-rose)`
   - Text: `var(--text-main)`, `var(--text-muted)`, `var(--text-dim)`
   - Buttons: `.btn .btn-primary`, `.btn .btn-secondary`, `.btn .btn-emerald`, `.btn .btn-danger`
   - Badges: `.badge .badge-indigo`, `.badge .badge-emerald`, `.badge .badge-cyan`, `.badge .badge-amber`
2. **Central API Client:**
   Do not use raw `fetch()` in components. Use `api.request()` or declare a method inside `frontend/src/api.js`. This ensures the JWT Bearer token is automatically attached.

---

## 7. Database Entity Relationship Overview (13 Tables)

All tables exist in `examsphere_db` and are initialized via `backend/database/schema.sql`:

1. `users`: Credentials, roles (`ADMIN`, `FACULTY`, `STUDENT`), password hashes (Module 1).
2. `courses`: `course_code`, `course_name`, `department`, `semester`, `difficulty_level` (Module 2).
3. `students`: `enrollment_no`, `name`, `email`, `department`, `semester`, `program` (Module 2).
4. `faculty`: `faculty_code`, `name`, `email`, `department`, `designation`, `seniority_level`, `max_duties` (Module 2).
5. `rooms`: `room_number`, `building`, `floor`, `capacity`, `rows_count`, `cols_count`, `has_camera` (Module 2).
6. `exams`: `course_id`, `exam_name`, `exam_type`, `exam_date`, `start_time`, `end_time`, `duration_minutes`, `status` (Module 3).
7. `seat_allocations`: Unique mapping of `(exam_id, room_id, row_num, col_num)` and `(exam_id, student_id)` (Module 4).
8. `invigilation_duties`: Unique mapping of `(exam_id, room_id)` with `faculty_id` and optional `substitute_faculty_id` (Module 5).
9. `doubt_requests`: Live questions routed from exam room to subject faculty (`question_text`, `status`) (Module 6).
10. `attendance`: `exam_id`, `student_id`, `room_id`, `status` (`PRESENT`, `ABSENT`), `verification_method` (`MANUAL`, `FACE_MATCH`), `face_confidence` (Module 7).
11. `ufm_reports`: Exam incident reporting with `invigilator_id`, `incident_details`, `evidence_photo_url`, `student_statement`, and review status (Module 8).
12. `notifications`: Email delivery queue (`recipient_email`, `type`, `subject`, `delivery_status`) (Module 9).
13. `audit_logs`: Immutable tracking of administrative modifications (`user_id`, `action`, `module`, `details`, `ip_address`).

---

## 8. Specifications for the 10 Functional Modules

### Module 1: Authentication & Role Management (Completed & Live)
- **Path:** `backend/services/authService.js`, `backend/controllers/authController.js`, `backend/routes/authRoutes.js`
- **Functionalities:** User login, JWT token issuance with 24h expiration, password hashing with bcrypt (10 rounds), role-based middleware (`ADMIN`, `FACULTY`, `STUDENT`).

### Module 2: Resource & Data Management (Completed & Live)
- **Path:** `backend/services/masterDataService.js`, `backend/services/csvIngestionService.js`, `backend/controllers/masterDataController.js`
- **Functionalities:** Complete CRUD operations for Students, Faculty, Courses, and Rooms. Extensible CSV streaming engine via Strategy Pattern.

### Module 3: Exam Scheduling (Pending)
- **Path:** `backend/services/schedulingService.js` & `backend/controllers/schedulingController.js`
- **Functionalities:** Create examinations, timetable generator, hard constraint conflict detection (no student or course overlapping time slots; respect room availability).

### Module 4: Smart Room & Seating Allocation (Completed & Live)
- **Path:** `backend/services/seatingService.js`, `backend/controllers/seatingController.js`, `backend/routes/seatingRoutes.js`, `frontend/src/components/SeatingAllocationView.jsx`
- **Functionalities:** Multi-subject student enrollment (`student_courses`), subject-first examination selection, dual allocation modes (Automatic Anti-Cheating Engine with `ALTERNATE_COLUMNS` & `MULTI_COURSE_INTERLEAVED`, plus interactive Manual Seating Studio with desk-by-desk placement), 2D classroom visualizer matrix, conflict scoring, printable roster.

### Module 5: Faculty Duty & Workload Management (Pending)
- **Path:** `backend/services/dutyService.js` & `backend/controllers/dutyController.js`
- **Functionalities:** Assign invigilators to exam halls and time slots, check faculty availability, ensure maximum duty ceilings (`max_duties`), balance duties across seniority tiers.

### Module 6: Faculty Portal & Doubt Resolution (Pending)
- **Path:** `backend/services/facultyPortalService.js` & `backend/controllers/facultyPortalController.js`
- **Functionalities:** Dedicated faculty view for examination schedules and invigilation duties, receive live student doubt requests forwarded from halls, submit answers or indicate room visit.

### Module 7: Invigilator Portal & Attendance (Pending)
- **Path:** `backend/services/attendanceService.js` & `backend/controllers/attendanceController.js`
- **Functionalities:** Invigilator dashboard for assigned room rosters, manual identity checklist, camera snapshot face matching comparison, attendance mark logging.

### Module 8: Exam-Day Incident Management (Pending)
- **Path:** `backend/services/incidentService.js` & `backend/controllers/incidentController.js`
- **Functionalities:** Digital Unfair Means (UFM) reporting with photo evidence upload and student statements, incident status review pipeline, substitute invigilator search.

### Module 9: Notification & Alert System (Pending)
- **Path:** `backend/services/notificationService.js` & `backend/controllers/notificationController.js`
- **Functionalities:** Asynchronous email dispatching (Nodemailer/SMTP), personalized student seating coordinates and schedules, faculty duty alerts, emergency notifications.

### Module 10: Analytics & Reports (Pending)
- **Path:** `backend/services/analyticsService.js` & `backend/controllers/analyticsController.js`
- **Functionalities:** SQL aggregation engine computing room capacity utilization rates, faculty duty balance distributions, student attendance percentages, and UFM incident summaries.

---

## 9. Quickstart Guide: Running the Project Locally

### Prerequisites
* **Node.js** (v20+ or v24+)
* **MySQL Server** (v8.0+) running on port 3306

### Step 1: Database Setup
1. Connect to MySQL and execute `backend/database/schema.sql`:
   ```bash
   /usr/local/mysql/bin/mysql -u root -p < backend/database/schema.sql
   ```
   *(Creates database `examsphere_db`, all 13 tables, and the default admin user: `admin@examsphere.edu` / `admin123`).*

### Step 2: Environment Configuration
1. Open `backend/.env` and ensure your database credentials match:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=examsphere_db
   DB_PORT=3306
   JWT_SECRET=examsphere_super_secret_jwt_key_2026
   JWT_EXPIRES_IN=24h
   ```

### Step 3: Verify with Automated Unit Tests
From the root directory, run:
```bash
npm test
```
*Expected result:* `🎯 RESULT: 10 / 10 TESTS PASSED` (5 Auth & CSV tests + 5 Smart Seating Engine tests).

### Step 4: Start Both Servers (One Command)
From the root directory:
```bash
npm run dev
```
* **Backend API:** `http://localhost:5000`
* **Frontend React UI:** `http://localhost:5173`

### Step 5: Sign In & Explore
1. Open `http://localhost:5173` in your browser.
2. Click **"Quick Demo: Fill Admin Account"** and click **Sign In**.
3. Access **Resource & Data (Module 2)**, **Smart Seating (Module 4)**, **System Audit Trail**, and the **Modules Hub**.
