```javascript
// Base API Client for ExamSphere
const API_BASE = 'http://localhost:5000/api';

export const api = {
  // Authentication & User Session
  getToken() {
    return localStorage.getItem('examsphere_token');
  },

  setToken(token) {
    localStorage.setItem('examsphere_token', token);
  },

  removeToken() {
    localStorage.removeItem('examsphere_token');
    localStorage.removeItem('examsphere_user');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('examsphere_user'));
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem('examsphere_user', JSON.stringify(user));
  },

  // Base HTTP Request
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = { ...(options.headers || {}) };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const isFormData =
      typeof FormData !== 'undefined' &&
      options.body instanceof FormData;

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.message || `Request failed with status ${res.status}`
      );
    }

    return data;
  },

  // Module 1: Authentication
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe() {
    return this.request('/auth/me');
  },

  // Module 2: Master Data
  getEntities(type) {
    return this.request(`/master-data/${type}`);
  },

  deleteEntity(type, id) {
    return this.request(`/master-data/${type}/${id}`, {
      method: 'DELETE',
    });
  },

  uploadCSV(type, file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(`/master-data/upload-csv/${type}`, {
      method: 'POST',
      body: formData,
    });
  },

  // Admin & Audit
  getSystemSummary() {
    return this.request('/admin/system-summary');
  },

  getAuditLogs() {
    return this.request('/admin/audit-logs');
  },

  // Module 3: Exam Scheduling & Timetable
  getExams() {
    return this.request('/scheduling/exams');
  },

  getExam(id) {
    return this.request(`/scheduling/exams/${id}`);
  },

  createExam(data) {
    return this.request('/scheduling/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateExam(id, data) {
    return this.request(`/scheduling/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteExam(id) {
    return this.request(`/scheduling/exams/${id}`, {
      method: 'DELETE',
    });
  },

  detectConflicts() {
    return this.request('/scheduling/conflicts');
  },

  generateTimetable(data) {
    return this.request('/scheduling/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Module 4A: Anti-Cheating Seating Allocation API
  allocateSeating(data) {
    return this.request('/seating/allocate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSeatingForExam(examId) {
    return this.request(`/seating/exam/${examId}`);
  },

  getRoomSeatingGrid(roomId, examId = null) {
    const queryStr = examId
      ? `?examId=${encodeURIComponent(examId)}`
      : '';

    return this.request(`/seating/room/${roomId}/grid${queryStr}`);
  },

  getRoomsOverview(examId = null) {
    const queryStr = examId
      ? `?examId=${encodeURIComponent(examId)}`
      : '';

    return this.request(`/seating/rooms-overview${queryStr}`);
  },

  clearSeatingAllocations(examId) {
    return this.request(`/seating/exam/${examId}`, {
      method: 'DELETE',
    });
  },

  // Module 4B: Room & Seating Allocation Engine API
  getAllocationExams() {
    return this.request('/allocations/exams');
  },

  allocateSeats(payload) {
    return this.request('/allocations/seating', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getSeatingByExam(examId) {
    return this.request(`/allocations/exam/${examId}`);
  },

  getRoomLayout(roomId, examId = null, strict = false) {
    const params = [];

    if (examId) {
      params.push(`examId=${encodeURIComponent(examId)}`);
    }

    if (strict) {
      params.push('strict=true');
    }

    const queryStr = params.length
      ? `?${params.join('&')}`
      : '';

    return this.request(`/allocations/room/${roomId}${queryStr}`);
  },

  clearAllocations(examId) {
    return this.request(`/allocations/exam/${examId}`, {
      method: 'DELETE',
    });
  },

  seedDemoExams() {
    return this.request('/allocations/seed-demo-exams', {
      method: 'POST',
    });
  },

  getEnrolledStudents(examId) {
    return this.request(`/allocations/enrolled-students/${examId}`);
  },

  saveManualSeating(payload) {
    return this.request('/allocations/manual-save', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  assignManualSeat(payload) {
    return this.request('/allocations/manual-seat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  unassignManualSeat(payload) {
    return this.request('/allocations/manual-seat', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  // Module 5: Faculty Duty & Workload Management
  getDutyRoster() {
    return this.request('/duty/roster');
  },

  getWorkloadStats() {
    return this.request('/duty/workload-stats');
  },

  autoAllocateDuties(data = {}) {
    return this.request('/duty/auto-allocate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  checkFacultyAvailability(params) {
    const query = new URLSearchParams(params).toString();

    return this.request(`/duty/availability?${query}`);
  },

  assignDuty(data) {
    return this.request('/duty/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  assignSubstitute(dutyId, substituteFacultyId) {
    return this.request(`/duty/${dutyId}/substitute`, {
      method: 'PUT',
      body: JSON.stringify({ substituteFacultyId }),
    });
  },

  removeDuty(dutyId) {
    return this.request(`/duty/${dutyId}`, {
      method: 'DELETE',
    });
  },

  resetDuties() {
    return this.request('/duty/reset-all', {
      method: 'POST',
    });
  },
};
```