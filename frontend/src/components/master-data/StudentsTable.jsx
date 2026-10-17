import React from 'react';
import { Trash2 } from 'lucide-react';

export default function StudentsTable({ data, loading, onDelete }) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9ca3af' }}>
        Loading student records...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem', color: '#6b7280' }}>
        No students found. Click <strong>"Upload STUDENTS CSV"</strong> above to import.
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Enrollment No</th>
          <th>Full Name</th>
          <th>Email Address</th>
          <th>Department</th>
          <th>Semester</th>
          <th>Enrolled Subjects</th>
          <th>Program</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id}>
            <td><span className="badge badge-indigo">{item.enrollment_no}</span></td>
            <td style={{ fontWeight: 600 }}>{item.name}</td>
            <td>{item.email}</td>
            <td><span className="badge badge-cyan">{item.department}</span></td>
            <td>Sem {item.semester}</td>
            <td>
              <span className="badge badge-emerald" style={{ fontSize: '0.74rem' }}>
                {item.enrolled_courses || 'None'}
              </span>
            </td>
            <td>{item.program}</td>
            <td>
              <button
                className="btn btn-danger"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                onClick={() => onDelete(item.id)}
                title="Delete Student"
              >
                <Trash2 size={13} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
