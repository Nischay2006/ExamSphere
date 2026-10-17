```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { testConnection } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const masterDataRoutes = require('./routes/masterDataRoutes');
const auditRoutes = require('./routes/auditRoutes');
const schedulingRoutes = require('./routes/schedulingRoutes'); // Module 3: Exam Scheduling
const seatingRoutes = require('./routes/seatingRoutes');       // Module 4: Seating Allocation
const dutyRoutes = require('./routes/dutyRoutes');             // Module 5: Faculty Duty Balancer
const incidentRoutes = require('./routes/incidentRoutes');     // Module 8: Exam-Day Incident Management

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    project: 'ExamSphere Backend',
    timestamp: new Date().toISOString()
  });
});

// Mount module routes
app.use('/api/auth', authRoutes);             // Module 1: Auth & RBAC
app.use('/api/master-data', masterDataRoutes); // Module 2: Master Data & Bulk CSV
app.use('/api/admin', auditRoutes);           // Module 11: Audit Logs & Stats
app.use('/api/scheduling', schedulingRoutes); // Module 3: Scheduling & Timetable
app.use('/api/seating', seatingRoutes);       // Module 4: Anti-Cheating Seating
app.use('/api/allocations', seatingRoutes);   // Module 4: Room & Seating Allocation
app.use('/api/duty', dutyRoutes);             // Module 5: Faculty Duty Balancer
app.use('/api/incidents', incidentRoutes);    // Module 8: Exam-Day Incident Management

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(` ExamSphere Backend Server running on port ${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log('====================================================');

  // Test MySQL connection on boot
  await testConnection();
});
```