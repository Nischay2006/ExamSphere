import React, { useState, useEffect } from 'react';
import { Search, Upload, RefreshCw, X } from 'lucide-react';
import { api } from '../api';
import CSVUploadModal from './CSVUploadModal';
import StudentsTable from './master-data/StudentsTable';
import FacultyTable from './master-data/FacultyTable';
import CoursesTable from './master-data/CoursesTable';
import RoomsTable from './master-data/RoomsTable';

/**
 * Modular MasterDataView
 * Coordinates tabs, search filters, and delegates rendering to individual table components
 */
export default function MasterDataView({ user, onDataChange }) {
  const [activeSubTab, setActiveSubTab] = useState('students');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.getEntities(activeSubTab);
      setData(res.data || []);
    } catch (err) {
      console.error('Fetch error:', err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (api.getToken()) {
      fetchRecords();
    }
    setSearch('');
  }, [activeSubTab, user]);

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete this ${activeSubTab.slice(0, -1)}?`)) {
      try {
        await api.deleteEntity(activeSubTab, id);
        fetchRecords();
        if (onDataChange) onDataChange();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const filteredData = data.filter((item) => {
    const q = search.toLowerCase();
    return Object.values(item).some(val => String(val).toLowerCase().includes(q));
  });

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <h2>Master Data Management</h2>
          <p>Module 2: Maintain verified academic records and batch CSV uploads</p>
        </div>

        <div className="panel-controls">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder={`Search ${activeSubTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button className="btn btn-secondary" onClick={fetchRecords} title="Refresh Records">
            <RefreshCw size={15} />
          </button>

          <button className="btn btn-emerald" onClick={() => setIsCSVModalOpen(true)}>
            <Upload size={15} />
            <span>Upload {activeSubTab.toUpperCase()} CSV</span>
          </button>
        </div>
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
        {['students', 'faculty', 'courses', 'rooms'].map((type) => (
          <button
            key={type}
            onClick={() => setActiveSubTab(type)}
            style={{
              background: activeSubTab === type ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeSubTab === type ? '#a5b4fc' : '#9ca3af',
              border: activeSubTab === type ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              padding: '0.4rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* High-Cohesion Decomposed Table Views */}
      <div className="table-wrapper">
        {activeSubTab === 'students' && (
          <StudentsTable data={filteredData} loading={loading} onDelete={handleDelete} />
        )}
        {activeSubTab === 'faculty' && (
          <FacultyTable data={filteredData} loading={loading} onDelete={handleDelete} />
        )}
        {activeSubTab === 'courses' && (
          <CoursesTable data={filteredData} loading={loading} onDelete={handleDelete} />
        )}
        {activeSubTab === 'rooms' && (
          <RoomsTable data={filteredData} loading={loading} onDelete={handleDelete} />
        )}
      </div>

      {/* Reusable CSV Upload Modal */}
      <CSVUploadModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        entityType={activeSubTab}
        onUploadSuccess={() => {
          fetchRecords();
          if (onDataChange) onDataChange();
        }}
      />
    </div>
  );
}
