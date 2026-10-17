import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api';
import {
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
  Grid,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Download,
  ChevronRight,
  PenTool,
  BookOpen,
  UserCheck,
  UserX,
  X,
  Plus,
  RefreshCw,
  Lock,
  Trash2,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  List
} from 'lucide-react';

export default function SeatingAllocationView({ user }) {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [secondaryExamId, setSecondaryExamId] = useState('');
  const [enableInterleaving, setEnableInterleaving] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [autoSelectRooms, setAutoSelectRooms] = useState(true);
  const [strategy, setStrategy] = useState('ALTERNATE_COLUMNS');

  // Allocation Mode: 'AUTOMATIC' vs 'MANUAL'
  const [allocationMode, setAllocationMode] = useState('AUTOMATIC');

  // Allocation State
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [allocationData, setAllocationData] = useState(null);
  const [hasClickedGenerate, setHasClickedGenerate] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [roomLayout, setRoomLayout] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Manual Studio State
  const [manualRoomId, setManualRoomId] = useState('');
  const [enrolledData, setEnrolledData] = useState(null);
  const [manualLayout, setManualLayout] = useState(null);
  const [selectedStudentToSeat, setSelectedStudentToSeat] = useState(null);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualFilter, setManualFilter] = useState('ALL'); // 'ALL' | 'UNSEATED' | 'SEATED'
  const [manualSaving, setManualSaving] = useState(false);

  // Manual Two-Paper State
  const [manualTwoPaper, setManualTwoPaper] = useState(false);
  const [manualSecondaryExamId, setManualSecondaryExamId] = useState('');
  const [secondaryEnrolledData, setSecondaryEnrolledData] = useState(null);
  const [sub2SearchQuery, setSub2SearchQuery] = useState('');
  const [sub2Filter, setSub2Filter] = useState('ALL'); // 'ALL' | 'UNSEATED' | 'SEATED'

  const [strategyPopover, setStrategyPopover] = useState(false);
  const [arrangementsSearch, setArrangementsSearch] = useState('');
  const [arrangementsFilter, setArrangementsFilter] = useState('ALLOCATED'); // 'ALLOCATED' | 'ALL' | 'PENDING'
  const [deletingExamId, setDeletingExamId] = useState(null);

  // Existing Plans Seating List State (No class visualization needed, only seating roster list)
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [examAllocationsMap, setExamAllocationsMap] = useState({});
  const [loadingExamAllocationsId, setLoadingExamAllocationsId] = useState(null);
  const [examListSearchMap, setExamListSearchMap] = useState({});

  // Schedule Reset Confirmation Modal State
  const [scheduleResetModal, setScheduleResetModal] = useState({
    isOpen: false,
    title: 'Reset Current Schedule?',
    message: 'Do you want to reset current schedule?',
    examsToReset: [],
    actionType: 'ENTER_MANUAL',
    targetExamId: null,
    targetSecondaryExamId: null,
    targetTwoPaper: false,
    targetRoomId: null
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && scheduleResetModal.isOpen) {
        setScheduleResetModal((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scheduleResetModal.isOpen]);

  const showToast = (message) => {
    setToastMessage(message);
    clearTimeout(window.__seatingToastTimer);
    window.__seatingToastTimer = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const triggerTwoPaperStrategyNotice = () => {
    setStrategyPopover(true);
    showToast('In case of 2 papers in one room, this is the only available option.');
    clearTimeout(window.__strategyPopoverTimer);
    window.__strategyPopoverTimer = setTimeout(() => {
      setStrategyPopover(false);
    }, 2800);
  };

  // Load initial exams and rooms
  const loadExamsAndRooms = async () => {
    setLoading(true);
    try {
      const [examsRes, roomsRes] = await Promise.all([
        api.getAllocationExams(),
        api.getEntities('rooms')
      ]);

      const examsList = examsRes.data || [];
      setExams(examsList);

      const roomsList = roomsRes.data || [];
      setRooms(roomsList);

      if (roomsList.length > 0 && !manualRoomId) {
        setManualRoomId(roomsList[0].id.toString());
      }

      if (examsList.length > 0 && !selectedExamId) {
        setSelectedExamId(examsList[0].id.toString());
        if (examsList.length > 1 && !secondaryExamId) {
          setSecondaryExamId(examsList[1].id.toString());
        }
        if (examsList.length > 1 && !manualSecondaryExamId) {
          setManualSecondaryExamId(examsList[1].id.toString());
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamsAndRooms();
  }, []);

  // Compute active exam query (combines primary and secondary exams if interleaving is enabled)
  const getActiveExamQuery = useCallback((primaryId = selectedExamId) => {
    if (!primaryId) return '';
    if (enableInterleaving && secondaryExamId && secondaryExamId.toString() !== primaryId.toString()) {
      return `${primaryId},${secondaryExamId}`;
    }
    return primaryId.toString();
  }, [selectedExamId, enableInterleaving, secondaryExamId]);

  // Data Loaders
  const loadExamAllocation = async (examQuery = getActiveExamQuery()) => {
    if (!examQuery) return;
    try {
      const res = await api.getSeatingByExam(examQuery);
      setAllocationData(res.data);
      if (res.data.rooms && res.data.rooms.length > 0) {
        setActiveRoomId(res.data.rooms[0].room_id);
        loadRoomMatrix(res.data.rooms[0].room_id, examQuery);
      } else {
        setActiveRoomId(null);
        setRoomLayout(null);
      }
    } catch (err) {
      setAllocationData(null);
      setRoomLayout(null);
    }
  };

  const loadEnrolledStudents = async (examId = selectedExamId) => {
    if (!examId) return;
    try {
      const res = await api.getEnrolledStudents(examId);
      setEnrolledData(res.data);
    } catch (err) {
      console.log('Error fetching enrolled students:', err.message);
    }
  };

  const loadRoomMatrix = async (roomId, examQuery = getActiveExamQuery()) => {
    if (!roomId || !examQuery) return;
    try {
      const res = await api.getRoomLayout(roomId, examQuery);
      setRoomLayout(res.data);
    } catch (err) {
      console.log('Room layout fetch note:', err.message);
    }
  };

  // Compute active manual exam query
  const getActiveManualQuery = useCallback((primaryId = selectedExamId) => {
    if (!primaryId) return '';
    if (manualTwoPaper && manualSecondaryExamId && manualSecondaryExamId.toString() !== primaryId.toString()) {
      return `${primaryId},${manualSecondaryExamId}`;
    }
    return primaryId.toString();
  }, [selectedExamId, manualTwoPaper, manualSecondaryExamId]);

  const loadSecondaryEnrolledStudents = async (examId = manualSecondaryExamId) => {
    if (!examId) return;
    try {
      const res = await api.getEnrolledStudents(examId);
      setSecondaryEnrolledData(res.data);
    } catch (err) {
      console.log('Error fetching secondary enrolled students:', err.message);
    }
  };

  // Helper: Find first allocated room for an exam if available
  const findExamAllocatedRoomId = useCallback((examId) => {
    if (!examId) return null;
    const exam = exams.find((e) => e.id.toString() === examId.toString());
    if (!exam || !exam.allocated_room_numbers) return null;
    const firstRoomNum = exam.allocated_room_numbers.split(',')[0].trim();
    const rm = rooms.find((r) => r.room_number.toLowerCase() === firstRoomNum.toLowerCase());
    return rm ? rm.id.toString() : null;
  }, [exams, rooms]);

  // Helper: Check if active subject(s) have an existing seating schedule
  const checkHasExistingSchedule = useCallback((primaryId, secondaryId, isTwoPaper) => {
    if (!primaryId) return false;
    const pExam = exams.find((e) => e.id.toString() === primaryId.toString());
    const sExam = (isTwoPaper && secondaryId) ? exams.find((e) => e.id.toString() === secondaryId.toString()) : null;
    const hasP = pExam && (pExam.allocated_seats_count || 0) > 0;
    const hasS = Boolean(isTwoPaper && sExam && (sExam.allocated_seats_count || 0) > 0);
    return hasP || hasS;
  }, [exams]);

  const loadManualRoomLayout = async (roomId = manualRoomId, examQuery = getActiveManualQuery(), strict = true) => {
    if (!roomId || !examQuery) return;
    try {
      const res = await api.getRoomLayout(roomId, examQuery, strict);
      setManualLayout(res.data);
    } catch (err) {
      console.log('Manual room layout fetch error:', err.message);
    }
  };

  const reloadManualData = async () => {
    const queryStr = getActiveManualQuery();
    const tasks = [
      loadManualRoomLayout(manualRoomId, queryStr, true),
      loadEnrolledStudents(selectedExamId),
      loadExamAllocation(queryStr)
    ];
    if (manualTwoPaper && manualSecondaryExamId) {
      tasks.push(loadSecondaryEnrolledStudents(manualSecondaryExamId));
    }
    await Promise.all(tasks);
  };

  // Synchronize data whenever selected exam, interleaving, or room changes
  useEffect(() => {
    if (selectedExamId) {
      const activeQuery = getActiveExamQuery(selectedExamId);
      loadEnrolledStudents(selectedExamId);
      loadExamAllocation(activeQuery);
      if (manualRoomId) {
        const manualQ = getActiveManualQuery(selectedExamId);
        loadManualRoomLayout(manualRoomId, manualQ);
        if (manualTwoPaper && manualSecondaryExamId) {
          loadSecondaryEnrolledStudents(manualSecondaryExamId);
        }
      }
    } else {
      setEnrolledData(null);
      setAllocationData(null);
      setRoomLayout(null);
    }
  }, [selectedExamId, manualRoomId, enableInterleaving, secondaryExamId, manualTwoPaper, manualSecondaryExamId, getActiveExamQuery, getActiveManualQuery]);

  useEffect(() => {
    if (enableInterleaving && strategy !== 'ALTERNATE_COLUMNS') {
      setStrategy('ALTERNATE_COLUMNS');
    } else if (strategy === 'MULTI_COURSE_INTERLEAVED') {
      setStrategy('ALTERNATE_COLUMNS');
    }
  }, [enableInterleaving, strategy]);

  // Handle explicit exam selection
  const handleExamChange = async (examId) => {
    setSelectedExamId(examId);
    setHasClickedGenerate(false);
    setSelectedStudentToSeat(null); // Initially all students unselected!
    setFeedback(null);

    if (!examId) {
      setAllocationData(null);
      setRoomLayout(null);
      setEnrolledData(null);
      setSecondaryEnrolledData(null);
      return;
    }

    let nextSecondaryId = secondaryExamId;
    if (enableInterleaving && (!secondaryExamId || secondaryExamId.toString() === examId.toString())) {
      const altExam = exams.find((e) => e.id.toString() !== examId.toString());
      if (altExam) {
        nextSecondaryId = altExam.id.toString();
        setSecondaryExamId(nextSecondaryId);
      }
    }

    let secId = manualSecondaryExamId;
    if (manualTwoPaper && (!manualSecondaryExamId || manualSecondaryExamId.toString() === examId.toString())) {
      const altExam = exams.find((e) => e.id.toString() !== examId.toString());
      if (altExam) {
        secId = altExam.id.toString();
        setManualSecondaryExamId(secId);
      }
    }

    if (allocationMode === 'MANUAL') {
      const hasExisting = checkHasExistingSchedule(examId, secId, manualTwoPaper);
      if (hasExisting) {
        const pExam = exams.find((e) => e.id.toString() === examId.toString());
        const sExam = (manualTwoPaper && secId) ? exams.find((e) => e.id.toString() === secId.toString()) : null;
        const affected = [];
        if (pExam && (pExam.allocated_seats_count || 0) > 0) affected.push(pExam);
        if (manualTwoPaper && sExam && (sExam.allocated_seats_count || 0) > 0) affected.push(sExam);

        setScheduleResetModal({
          isOpen: true,
          title: 'Existing Seating Schedule Detected',
          message: 'Do you want to reset current schedule?',
          examsToReset: affected,
          actionType: 'CHANGE_PRIMARY',
          targetExamId: examId,
          targetSecondaryExamId: secId,
          targetTwoPaper: manualTwoPaper,
          targetRoomId: findExamAllocatedRoomId(examId) || manualRoomId
        });
        return;
      }

      await executeEnterManualMode(false, examId, secId, manualTwoPaper);
      return;
    }

    const activeQuery = (enableInterleaving && nextSecondaryId && nextSecondaryId.toString() !== examId.toString())
      ? `${examId},${nextSecondaryId}`
      : examId.toString();

    await Promise.all([
      loadEnrolledStudents(examId),
      loadExamAllocation(activeQuery),
      manualRoomId ? loadManualRoomLayout(manualRoomId, examId, false) : Promise.resolve()
    ]);
  };

  // Switch to Automatic mode
  const handleSelectAutomaticMode = () => {
    setAllocationMode('AUTOMATIC');
    setHasClickedGenerate(false);
  };

  // Helper: Reset seating arrangement to zero for specified subject(s)
  const ensureManualZeroSeating = async (primaryId, secondaryId, isTwoPaper) => {
    if (!primaryId) return;
    const pExam = exams.find((e) => e.id.toString() === primaryId.toString());
    const sExam = (isTwoPaper && secondaryId) ? exams.find((e) => e.id.toString() === secondaryId.toString()) : null;

    const hasP = pExam && pExam.allocated_seats_count > 0;
    const hasS = isTwoPaper && sExam && sExam.allocated_seats_count > 0;

    if (isTwoPaper) {
      if (hasP || hasS) {
        const ids = [primaryId];
        if (secondaryId && secondaryId.toString() !== primaryId.toString()) {
          ids.push(secondaryId);
        }
        await api.clearAllocations(ids.join(','));
        const updated = await api.getAllocationExams();
        setExams(updated.data || []);
      }
    } else {
      if (hasP) {
        await api.clearAllocations(primaryId);
        const updated = await api.getAllocationExams();
        setExams(updated.data || []);
      }
    }
  };

  // Execute entry into Manual Mode:
  // if shouldResetZero is true -> reset schedule to zero (make it zero)
  // else -> arrange the current schedule in manual option
  const executeEnterManualMode = async (shouldResetZero, primaryId, secondaryId, isTwoPaper, roomIdToUse) => {
    setAllocationMode('MANUAL');
    setSelectedStudentToSeat(null);
    setManualFilter('ALL');
    setSub2Filter('ALL');

    const targetRoom = roomIdToUse || findExamAllocatedRoomId(primaryId) || manualRoomId;
    if (targetRoom) {
      setManualRoomId(targetRoom);
    }

    if (secondaryId) {
      setManualSecondaryExamId(secondaryId);
    }
    setManualTwoPaper(Boolean(isTwoPaper));

    if (shouldResetZero && primaryId) {
      await ensureManualZeroSeating(primaryId, secondaryId, isTwoPaper);
      showToast('Current schedule reset to zero. All desks are clear for manual placement.');
    } else {
      showToast('Current schedule loaded in Manual Option. Desks are arranged for manual editing.');
    }

    const q = (isTwoPaper && secondaryId && secondaryId.toString() !== primaryId.toString())
      ? `${primaryId},${secondaryId}`
      : (primaryId ? primaryId.toString() : '');

    const tasks = [
      loadManualRoomLayout(targetRoom, q, true),
      loadEnrolledStudents(primaryId),
      loadExamAllocation(q)
    ];
    if (isTwoPaper && secondaryId) {
      tasks.push(loadSecondaryEnrolledStudents(secondaryId));
    }
    await Promise.all(tasks);
  };

  // Handle user response from the Reset Current Schedule prompt modal:
  // if user says yes (resetToZero === true) -> make it zero!
  // else (resetToZero === false) -> arrange the current schedule in manual option!
  const handleConfirmResetModal = async (resetToZero) => {
    const { actionType, targetExamId, targetSecondaryExamId, targetTwoPaper, targetRoomId } = scheduleResetModal;
    setScheduleResetModal((prev) => ({ ...prev, isOpen: false }));

    if (actionType === 'ENTER_MANUAL') {
      await executeEnterManualMode(resetToZero, targetExamId, targetSecondaryExamId, targetTwoPaper, targetRoomId);
    } else if (actionType === 'CHANGE_PRIMARY') {
      setSelectedExamId(targetExamId.toString());
      await executeEnterManualMode(resetToZero, targetExamId, targetSecondaryExamId, targetTwoPaper, targetRoomId);
    } else if (actionType === 'TOGGLE_TWO_PAPER') {
      setManualTwoPaper(true);
      if (targetSecondaryExamId) setManualSecondaryExamId(targetSecondaryExamId.toString());
      if (resetToZero) {
        await ensureManualZeroSeating(targetExamId, targetSecondaryExamId, true);
        showToast('Current schedule reset to zero for both subjects. Start placing students manually.');
      } else {
        showToast('Current schedule loaded for both subjects in Manual Option. Desks are arranged for manual editing.');
      }
      await reloadManualData();
    } else if (actionType === 'CHANGE_SECONDARY') {
      setManualSecondaryExamId(targetSecondaryExamId.toString());
      if (resetToZero) {
        await api.clearAllocations(targetSecondaryExamId);
        const updatedExams = await api.getAllocationExams();
        setExams(updatedExams.data || []);
        showToast('Current schedule reset to zero for secondary subject. Desks are vacant.');
      } else {
        showToast('Current schedule loaded for secondary subject in Manual Option.');
      }
      await loadSecondaryEnrolledStudents(targetSecondaryExamId);
      await loadManualRoomLayout(manualRoomId, `${targetExamId},${targetSecondaryExamId}`, true);
    }
  };

  // Switch to Manual mode:
  // Before making it zero, ask user: "Do you want to reset current schedule?"
  // If user says yes -> make it zero.
  // Else -> arrange current schedule in manual option!
  const handleSelectManualMode = async () => {
    let secId = manualSecondaryExamId;
    if (manualTwoPaper && (!secId || secId.toString() === selectedExamId.toString()) && exams.length > 1) {
      const alt = exams.find((e) => e.id.toString() !== selectedExamId.toString());
      if (alt) {
        secId = alt.id.toString();
        setManualSecondaryExamId(secId);
      }
    }

    const hasExisting = checkHasExistingSchedule(selectedExamId, secId, manualTwoPaper);
    if (hasExisting) {
      const pExam = exams.find((e) => e.id.toString() === selectedExamId.toString());
      const sExam = (manualTwoPaper && secId) ? exams.find((e) => e.id.toString() === secId.toString()) : null;
      const affected = [];
      if (pExam && (pExam.allocated_seats_count || 0) > 0) affected.push(pExam);
      if (manualTwoPaper && sExam && (sExam.allocated_seats_count || 0) > 0) affected.push(sExam);

      setScheduleResetModal({
        isOpen: true,
        title: 'Existing Seating Schedule Detected',
        message: 'Do you want to reset current schedule?',
        examsToReset: affected,
        actionType: 'ENTER_MANUAL',
        targetExamId: selectedExamId,
        targetSecondaryExamId: secId,
        targetTwoPaper: manualTwoPaper,
        targetRoomId: findExamAllocatedRoomId(selectedExamId) || manualRoomId
      });
      return;
    }

    await executeEnterManualMode(false, selectedExamId, secId, manualTwoPaper);
  };

  // Direct action from Existing Plans archive: Arrange directly in Manual Studio
  const handleArrangeExamInManual = async (exam) => {
    setSelectedExamId(exam.id.toString());
    const allocRoomId = findExamAllocatedRoomId(exam.id);
    await executeEnterManualMode(false, exam.id.toString(), manualSecondaryExamId, false, allocRoomId);
  };

  // --------------------------------------------------------------------------
  // Existing Seating Arrangements Management
  // --------------------------------------------------------------------------
  const allocatedExamsCount = exams.filter((e) => (e.allocated_seats_count || 0) > 0).length;
  const pendingExamsCount = exams.filter((e) => (e.allocated_seats_count || 0) === 0).length;
  const totalStudentsSeatedAcrossExams = exams.reduce((sum, e) => sum + (e.allocated_seats_count || 0), 0);

  const filteredArrangements = useMemo(() => {
    return exams.filter((e) => {
      const isAllocated = (e.allocated_seats_count || 0) > 0;
      if (arrangementsFilter === 'ALLOCATED' && !isAllocated) return false;
      if (arrangementsFilter === 'PENDING' && isAllocated) return false;

      if (!arrangementsSearch) return true;
      const q = arrangementsSearch.toLowerCase();
      return (
        e.course_code?.toLowerCase().includes(q) ||
        e.course_name?.toLowerCase().includes(q) ||
        e.exam_name?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.allocated_room_numbers?.toLowerCase().includes(q)
      );
    });
  }, [exams, arrangementsFilter, arrangementsSearch]);

  const handleSelectExistingPlansMode = () => {
    setAllocationMode('EXISTING_PLANS');
    setHasClickedGenerate(false);
  };

  // Toggle inline seating list for an exam in Existing Plans view (no classroom visualization needed)
  const handleToggleExamSeatingList = async (exam) => {
    if (expandedExamId === exam.id) {
      setExpandedExamId(null);
      return;
    }

    setExpandedExamId(exam.id);

    if (!examAllocationsMap[exam.id]) {
      setLoadingExamAllocationsId(exam.id);
      try {
        const res = await api.getSeatingByExam(exam.id);
        setExamAllocationsMap((prev) => ({
          ...prev,
          [exam.id]: res.data?.allocations || []
        }));
      } catch (err) {
        showToast(`Failed to load seating list: ${err.message}`);
      } finally {
        setLoadingExamAllocationsId(null);
      }
    }
  };

  const handleDownloadExamCSV = async (exam) => {
    try {
      showToast(`Fetching seating roster for ${exam.course_code}...`);
      const res = await api.getSeatingByExam(exam.id);
      if (res.data && res.data.allocations && res.data.allocations.length > 0) {
        exportAllocationsToCSV(res.data.allocations);
      } else {
        showToast(`⚠️ No active seating assignments found for ${exam.course_code}.`);
      }
    } catch (err) {
      showToast(`Download error: ${err.message}`);
    }
  };

  const handleDeleteArrangement = async (exam) => {
    const confirmMsg = `Are you sure you want to delete the seating arrangement for ${exam.course_code} (${exam.exam_name})?\n\nThis will remove all ${exam.allocated_seats_count} assigned seat(s) and return all students to the unseated pool.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingExamId(exam.id);
    try {
      await api.clearAllocations(exam.id);
      const updatedExams = await api.getAllocationExams();
      setExams(updatedExams.data || []);

      // Clean up expanded seating list cache
      setExamAllocationsMap((prev) => {
        const copy = { ...prev };
        delete copy[exam.id];
        return copy;
      });
      if (expandedExamId === exam.id) {
        setExpandedExamId(null);
      }

      if (selectedExamId === exam.id.toString()) {
        setAllocationData(null);
        setRoomLayout(null);
        setHasClickedGenerate(false);
        await loadEnrolledStudents(exam.id.toString());
      }

      showToast(`🗑️ Deleted seating arrangement for ${exam.course_code}. All students returned to pool.`);
    } catch (err) {
      showToast(`Delete failed: ${err.message}`);
    } finally {
      setDeletingExamId(null);
    }
  };

  const handleClearAllArrangements = async () => {
    const allocatedExams = exams.filter((e) => (e.allocated_seats_count || 0) > 0);
    if (allocatedExams.length === 0) {
      showToast('No active seating arrangements to delete.');
      return;
    }

    const confirmMsg = `WARNING: Are you sure you want to delete ALL seating arrangements across ${allocatedExams.length} examination(s)?\n\nThis will remove all allocated seats across the university database and return all students to their unseated pools.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const allIds = allocatedExams.map((e) => e.id).join(',');
      await api.clearAllocations(allIds);
      const updatedExams = await api.getAllocationExams();
      setExams(updatedExams.data || []);
      setExamAllocationsMap({});
      setExpandedExamId(null);
      setAllocationData(null);
      setRoomLayout(null);
      setHasClickedGenerate(false);
      if (selectedExamId) {
        await loadEnrolledStudents(selectedExamId);
      }
      showToast(`🗑️ Cleared all seating arrangements across ${allocatedExams.length} examination(s).`);
    } catch (err) {
      showToast(`Error clearing arrangements: ${err.message}`);
    }
  };

  // Save manual seating plan to database
  const handleSaveManualSeating = async () => {
    if (!selectedExamId || !manualRoomId) {
      showToast('Please select a subject exam and classroom first.');
      return { success: false, error: 'Missing exam or room' };
    }

    setManualSaving(true);
    try {
      const assignments = [];
      if (manualLayout && manualLayout.matrix) {
        for (const row of manualLayout.matrix) {
          for (const seat of row) {
            if (seat.isOccupied && seat.student_id) {
              assignments.push({
                student_id: seat.student_id,
                exam_id: seat.exam_id || parseInt(selectedExamId, 10),
                row_num: seat.row_num,
                col_num: seat.col_num,
                seat_number: seat.seat_number
              });
            }
          }
        }
      }

      const activeExamIds = [parseInt(selectedExamId, 10)];
      if (manualTwoPaper && manualSecondaryExamId && manualSecondaryExamId !== selectedExamId) {
        activeExamIds.push(parseInt(manualSecondaryExamId, 10));
      }

      await api.saveManualSeating({
        exam_id: activeExamIds,
        room_id: parseInt(manualRoomId, 10),
        assignments
      });

      const currentRoom = rooms.find((r) => r.id.toString() === manualRoomId.toString());
      const roomLabel = currentRoom ? currentRoom.room_number : `Room ${manualRoomId}`;

      setFeedback({
        type: 'success',
        message: `Manual Seating Plan saved successfully! ${assignments.length} seat(s) assigned in ${roomLabel}.`
      });
      showToast(`💾 Saved ${assignments.length} seat assignment(s) successfully!`);

      const updatedExams = await api.getAllocationExams();
      setExams(updatedExams.data || []);
      await reloadManualData();
      return { success: true, count: assignments.length };
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save manual seating.' });
      showToast(`Save error: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setManualSaving(false);
    }
  };

  const handleRoomTabClick = (roomId) => {
    setActiveRoomId(roomId);
    loadRoomMatrix(roomId, getActiveExamQuery());
  };

  const handleRunAllocation = async () => {
    if (!selectedExamId) {
      setFeedback({ type: 'error', message: 'Please select a primary subject / exam to allocate.' });
      return;
    }

    // Capacity validation for Manual Room Selection
    if (!autoSelectRooms) {
      if (!selectedRoomIds || selectedRoomIds.length === 0) {
        const msg = "In this much room this strategy can't be implemented. Please select at least one classroom under Manual Room Selection.";
        setFeedback({ type: 'error', message: msg });
        showToast("⚠️ In this much room this strategy can't be implemented.");
        return;
      }

      if (autoManualUsableSeats < autoTotalStudentsNeeded) {
        const errorMsg = `In this much room this strategy can't be implemented. Selected room(s) provide only ${autoManualUsableSeats} usable seat(s) under '${autoStrategyLabel}', but ${autoTotalStudentsNeeded} student(s) need to be seated. Please select more rooms or choose a different strategy.`;
        setFeedback({
          type: 'error',
          message: errorMsg
        });
        showToast("⚠️ In this much room this strategy can't be implemented.");
        return;
      }
    }

    setAllocating(true);
    setFeedback(null);

    try {
      const examIds = [parseInt(selectedExamId, 10)];
      if (enableInterleaving && secondaryExamId && secondaryExamId !== selectedExamId) {
        examIds.push(parseInt(secondaryExamId, 10));
      }

      const payload = {
        exam_ids: examIds,
        room_ids: autoSelectRooms ? null : selectedRoomIds,
        strategy,
        clearExisting: true
      };

      const res = await api.allocateSeats(payload);
      setFeedback({
        type: 'success',
        message: res.message || 'Seating generated successfully!'
      });

      setHasClickedGenerate(true);

      // Reload exams and current allocation view
      const updatedExams = await api.getAllocationExams();
      setExams(updatedExams.data || []);
      const activeQuery = getActiveExamQuery(selectedExamId);
      await Promise.all([
        loadExamAllocation(activeQuery),
        loadEnrolledStudents(selectedExamId)
      ]);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setAllocating(false);
    }
  };

  const handleClearAllocation = async () => {
    if (!selectedExamId) return;
    if (!window.confirm('Are you sure you want to clear all seat allocations for this subject exam?')) return;

    try {
      const activeQuery = getActiveExamQuery(selectedExamId);
      const res = await api.clearAllocations(activeQuery);
      setFeedback({ type: 'info', message: res.message });
      setAllocationData(null);
      setRoomLayout(null);
      setHasClickedGenerate(false);
      const updatedExams = await api.getAllocationExams();
      setExams(updatedExams.data || []);
      await loadEnrolledStudents(selectedExamId);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Manual Seating Handlers
  const handleManualDeskClick = async (r, c, existingSeat) => {
    if (existingSeat && existingSeat.isOccupied) {
      // Unseat student back to student pool
      try {
        await api.unassignManualSeat({
          exam_id: existingSeat.exam_id || parseInt(selectedExamId, 10),
          room_id: parseInt(manualRoomId, 10),
          row_num: r,
          col_num: c
        });
        showToast(`Unseated ${existingSeat.student_name} (#${existingSeat.enrollment_no}) back to student pool`);
        await reloadManualData();
      } catch (err) {
        showToast(`Error: ${err.message}`);
      }
      return;
    }

    // Empty desk: place selected student
    if (!selectedStudentToSeat) {
      showToast('👉 Click a student from Subject 1 (left) or Subject 2 (right) first, then click a vacant desk.');
      return;
    }

    try {
      const activeRoom = rooms.find((rm) => rm.id.toString() === manualRoomId.toString());
      const roomNum = activeRoom ? activeRoom.room_number : `Room-${manualRoomId}`;
      const seatNo = `${roomNum}-R${r}-C${c}`;
      const targetExamId = selectedStudentToSeat.exam_id || parseInt(selectedExamId, 10);

      await api.assignManualSeat({
        exam_id: targetExamId,
        room_id: parseInt(manualRoomId, 10),
        student_id: selectedStudentToSeat.id,
        row_num: r,
        col_num: c,
        seat_number: seatNo
      });

      showToast(`Positioned ${selectedStudentToSeat.name} (${selectedStudentToSeat.course_code || ''}) at ${seatNo}`);
      setSelectedStudentToSeat(null);
      await reloadManualData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleAutoFillRemainingManual = async () => {
    if (!manualLayout || !manualLayout.matrix) return;

    const activeRoom = rooms.find((rm) => rm.id.toString() === manualRoomId.toString());
    const roomNum = activeRoom ? activeRoom.room_number : `Room-${manualRoomId}`;

    const emptyDesks = [];
    const assignments = [];

    // Keep existing occupied seats in this room
    for (const row of manualLayout.matrix) {
      for (const seat of row) {
        if (seat.isOccupied && seat.student_id) {
          assignments.push({
            student_id: seat.student_id,
            exam_id: seat.exam_id || parseInt(selectedExamId, 10),
            row_num: seat.row_num,
            col_num: seat.col_num,
            seat_number: seat.seat_number
          });
        } else {
          emptyDesks.push({ r: seat.row_num, c: seat.col_num });
        }
      }
    }

    if (emptyDesks.length === 0) {
      showToast('No empty desks available in this room!');
      return;
    }

    const unseated1 = (enrolledData?.students || []).filter((s) => !s.isAllocated);
    const unseated2 = manualTwoPaper && secondaryEnrolledData
      ? (secondaryEnrolledData.students || []).filter((s) => !s.isAllocated)
      : [];

    if (unseated1.length === 0 && unseated2.length === 0) {
      showToast('All enrolled students are already seated!');
      return;
    }

    let newlyPlaced = 0;
    if (manualTwoPaper && (unseated1.length > 0 || unseated2.length > 0)) {
      // Interleave filling empty desks row by row alternating between Sub 1 and Sub 2
      let p1 = 0;
      let p2 = 0;
      for (let i = 0; i < emptyDesks.length; i++) {
        const desk = emptyDesks[i];
        let chosenStudent = null;
        let chosenExamId = null;

        // Odd columns (C1, C3, C5...): Strictly Subject 1
        if (desk.c % 2 !== 0) {
          if (p1 < unseated1.length) {
            chosenStudent = unseated1[p1++];
            chosenExamId = parseInt(selectedExamId, 10);
          }
        } else {
          // Even columns (C2, C4, C6...): Strictly Subject 2
          if (p2 < unseated2.length) {
            chosenStudent = unseated2[p2++];
            chosenExamId = parseInt(manualSecondaryExamId, 10);
          }
        }

        if (chosenStudent) {
          assignments.push({
            student_id: chosenStudent.id,
            exam_id: chosenExamId,
            row_num: desk.r,
            col_num: desk.c,
            seat_number: `${roomNum}-R${desk.r}-C${desk.c}`
          });
          newlyPlaced++;
        }
      }
    } else {
      // Single paper filling
      const toSeatCount = Math.min(unseated1.length, emptyDesks.length);
      for (let i = 0; i < toSeatCount; i++) {
        const student = unseated1[i];
        const desk = emptyDesks[i];
        assignments.push({
          student_id: student.id,
          exam_id: parseInt(selectedExamId, 10),
          row_num: desk.r,
          col_num: desk.c,
          seat_number: `${roomNum}-R${desk.r}-C${desk.c}`
        });
        newlyPlaced++;
      }
    }

    try {
      setManualSaving(true);
      const activeExamIds = [parseInt(selectedExamId, 10)];
      if (manualTwoPaper && manualSecondaryExamId && manualSecondaryExamId !== selectedExamId) {
        activeExamIds.push(parseInt(manualSecondaryExamId, 10));
      }

      await api.saveManualSeating({
        exam_id: activeExamIds,
        room_id: parseInt(manualRoomId, 10),
        assignments
      });
      showToast(`Auto-placed ${newlyPlaced} students into ${roomNum}!`);
      await reloadManualData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setManualSaving(false);
    }
  };

  const handleClearRoomManual = async () => {
    if (!manualRoomId) return;
    if (!window.confirm('Clear all student seat allocations in this room and return them to the student pool?')) return;
    try {
      setManualSaving(true);
      const activeExamIds = [parseInt(selectedExamId, 10)];
      if (manualTwoPaper && manualSecondaryExamId && manualSecondaryExamId !== selectedExamId) {
        activeExamIds.push(parseInt(manualSecondaryExamId, 10));
      }

      await api.saveManualSeating({
        exam_id: activeExamIds,
        room_id: parseInt(manualRoomId, 10),
        assignments: []
      });
      setSelectedStudentToSeat(null);
      showToast('Cleared all desks in this room. Students returned to pool.');
      await reloadManualData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setManualSaving(false);
    }
  };

  const handleSeedDemoExams = async () => {
    try {
      const res = await api.seedDemoExams();
      setFeedback({ type: 'success', message: res.message });
      await loadExamsAndRooms();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const getCourseColor = (courseCode) => {
    if (!courseCode) return { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: '#9ca3af' };
    const hash = courseCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.45)', text: '#6ee7b7' },
      { bg: 'rgba(6, 182, 212, 0.18)', border: 'rgba(6, 182, 212, 0.45)', text: '#67e8f9' },
      { bg: 'rgba(139, 92, 246, 0.18)', border: 'rgba(139, 92, 246, 0.45)', text: '#c4b5fd' },
      { bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.45)', text: '#fcd34d' }
    ];
    return colors[hash % colors.length];
  };

  const selectedExam = exams.find((e) => e.id.toString() === selectedExamId);

  const filteredAllocations = (allocationData?.allocations || []).filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.student_name?.toLowerCase().includes(q) ||
      item.enrollment_no?.toLowerCase().includes(q) ||
      item.seat_number?.toLowerCase().includes(q) ||
      item.room_number?.toLowerCase().includes(q) ||
      item.course_code?.toLowerCase().includes(q)
    );
  });

  // Core helper to export any allocations array to CSV
  const exportAllocationsToCSV = (listToExport) => {
    if (!listToExport || listToExport.length === 0) {
      showToast('⚠️ No student seating allocation data found to download. Please generate or assign seating first.');
      return;
    }

    const headers = [
      'SEAT NUMBER',
      'ROOM',
      'ROW / COL',
      'ENROLLMENT NO',
      'STUDENT NAME',
      'COURSE',
      'DEPARTMENT'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).trim();
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const rows = listToExport.map((item) => [
      escapeCSV(item.seat_number || ''),
      escapeCSV(item.room_number || ''),
      escapeCSV(`Row ${item.row_num}, Col ${item.col_num}`),
      escapeCSV(item.enrollment_no || ''),
      escapeCSV(item.student_name || ''),
      escapeCSV(item.course_code || ''),
      escapeCSV(item.department || '')
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const secExam = exams.find((e) => e.id.toString() === secondaryExamId?.toString());
    const courseCode = enableInterleaving && secExam
      ? `${selectedExam?.course_code || 'Course1'}_${secExam.course_code}`
      : selectedExam?.course_code || 'SeatingPlan';
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `${courseCode}_seating_roster_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`📥 Successfully downloaded CSV roster for ${listToExport.length} student(s)!`);
  };

  // Derive distinct courses and seat counts present in currently displayed room layout
  const roomCourses = useMemo(() => {
    if (!roomLayout || !roomLayout.matrix) return [];
    const counts = {};
    for (const row of roomLayout.matrix) {
      for (const seat of row) {
        if (seat.isOccupied && seat.course_code) {
          counts[seat.course_code] = (counts[seat.course_code] || 0) + 1;
        }
      }
    }
    return Object.entries(counts).map(([code, count]) => ({ course_code: code, count }));
  }, [roomLayout]);

  // Download Student Seating Plan as CSV for Automatic Mode
  const handleDownloadCSV = () => {
    const listToExport = searchQuery ? filteredAllocations : (allocationData?.allocations || []);
    exportAllocationsToCSV(listToExport);
  };

  // Download Student Seating Plan as CSV for Manual Mode (first saves plan, then downloads)
  const handleManualDownloadCSV = async () => {
    let placedSeatsCount = 0;
    if (manualLayout && manualLayout.matrix) {
      for (const row of manualLayout.matrix) {
        for (const seat of row) {
          if (seat.isOccupied && seat.student_id) placedSeatsCount++;
        }
      }
    }

    if (placedSeatsCount === 0 && (!allocationData || allocationData.totalAllocated === 0)) {
      showToast('⚠️ No students seated yet. Please place students on desks first.');
      return;
    }

    // 1. First of all save
    showToast('💾 Saving manual seating plan before download...');
    const saveRes = await handleSaveManualSeating();
    if (!saveRes || !saveRes.success) return;

    // 2. Then download latest allocation roster
    try {
      const activeManualQuery = (manualTwoPaper && manualSecondaryExamId && manualSecondaryExamId !== selectedExamId)
        ? `${selectedExamId},${manualSecondaryExamId}`
        : selectedExamId;
      const res = await api.getSeatingByExam(activeManualQuery);
      const listToExport = res.data?.allocations || [];
      if (listToExport.length === 0) {
        showToast('⚠️ No seat assignments found to export.');
        return;
      }
      exportAllocationsToCSV(listToExport);
    } catch (err) {
      if (allocationData?.allocations?.length > 0) {
        exportAllocationsToCSV(allocationData.allocations);
      } else {
        showToast(`Download error: ${err.message}`);
      }
    }
  };

  // Subject 1 student counts and list
  const sub1Students = enrolledData?.students || [];
  const sub1Total = enrolledData?.totalStudents || 0;
  const sub1Unseated = sub1Students.filter((s) => !s.isAllocated).length;
  const sub1Seated = sub1Students.filter((s) => s.isAllocated).length;
  const filteredSub1Students = sub1Students.filter((s) => {
    if (manualFilter === 'UNSEATED' && s.isAllocated) return false;
    if (manualFilter === 'SEATED' && !s.isAllocated) return false;
    if (!manualSearchQuery) return true;
    const q = manualSearchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.enrollment_no?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q) ||
      s.seat_number?.toLowerCase().includes(q)
    );
  });

  // Subject 2 student counts and list (for Manual Two-Paper Studio)
  const sub2Students = secondaryEnrolledData?.students || [];
  const sub2Total = secondaryEnrolledData?.totalStudents || 0;
  const sub2Unseated = sub2Students.filter((s) => !s.isAllocated).length;
  const sub2Seated = sub2Students.filter((s) => s.isAllocated).length;
  const filteredSub2Students = sub2Students.filter((s) => {
    if (sub2Filter === 'UNSEATED' && s.isAllocated) return false;
    if (sub2Filter === 'SEATED' && !s.isAllocated) return false;
    if (!sub2SearchQuery) return true;
    const q = sub2SearchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.enrollment_no?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q) ||
      s.seat_number?.toLowerCase().includes(q)
    );
  });

  const unseatedCount = sub1Unseated;
  const seatedCount = sub1Seated;
  const filteredEnrolledStudents = filteredSub1Students;
  const manualSecondaryExam = exams.find((e) => e.id.toString() === manualSecondaryExamId);

  const sub1Course = enrolledData?.course || selectedExam;
  const sub1CourseCode = sub1Course?.course_code || 'SUB1';
  const sub1CourseName = sub1Course?.course_name || selectedExam?.course_name || 'Subject 1';

  const sub2Course = secondaryEnrolledData?.course || manualSecondaryExam;
  const sub2CourseCode = sub2Course?.course_code || 'SUB2';
  const sub2CourseName = sub2Course?.course_name || manualSecondaryExam?.course_name || 'Subject 2';

  // Automatic mode capacity calculations
  const autoPrimaryCount = selectedExam?.eligible_students_count || (enrolledData?.exam?.id?.toString() === selectedExamId?.toString() ? enrolledData?.totalStudents : 0) || 0;
  const autoSecondaryExam = exams.find((e) => e.id.toString() === secondaryExamId?.toString());
  const autoSecondaryCount = (enableInterleaving && secondaryExamId && secondaryExamId !== selectedExamId)
    ? (autoSecondaryExam?.eligible_students_count || 0)
    : 0;
  const autoTotalStudentsNeeded = autoPrimaryCount + autoSecondaryCount;

  const autoSelectedRooms = rooms.filter((r) => selectedRoomIds.includes(r.id));
  const autoManualUsableSeats = (() => {
    if (strategy === 'ALTERNATE_COLUMNS' || strategy === 'CHECKERBOARD_SPACED') {
      let totalOdd = 0;
      let totalEven = 0;
      for (const rm of autoSelectedRooms) {
        const rows = rm.rows_count || 5;
        const cols = rm.cols_count || Math.ceil(rm.capacity / rows);
        totalOdd += rows * Math.ceil(cols / 2);
        totalEven += rows * Math.floor(cols / 2);
      }

      if (enableInterleaving && secondaryExamId && secondaryExamId !== selectedExamId) {
        return Math.min(autoPrimaryCount, totalOdd) + Math.min(autoSecondaryCount, totalEven);
      } else {
        return totalOdd;
      }
    }

    if (strategy === 'MULTI_COURSE_INTERLEAVED' && enableInterleaving && secondaryExamId && secondaryExamId !== selectedExamId) {
      let totalSeats1 = 0;
      let totalSeats2 = 0;
      for (const rm of autoSelectedRooms) {
        const rows = rm.rows_count || 5;
        const cols = rm.cols_count || Math.ceil(rm.capacity / rows);
        const maxCap = Math.min(rm.capacity, rows * cols);
        totalSeats1 += Math.ceil(maxCap / 2);
        totalSeats2 += Math.floor(maxCap / 2);
      }
      return Math.min(autoPrimaryCount, totalSeats1) + Math.min(autoSecondaryCount, totalSeats2);
    }

    return autoSelectedRooms.reduce((sum, rm) => {
      const rows = rm.rows_count || 5;
      const cols = rm.cols_count || Math.ceil(rm.capacity / rows);
      return sum + Math.min(rm.capacity, rows * cols);
    }, 0);
  })();

  const autoStrategyLabel = strategy === 'ALTERNATE_COLUMNS' || strategy === 'CHECKERBOARD_SPACED'
    ? (enableInterleaving ? 'Alternate Columns Side-by-Side' : 'Alternate Column Spacing (Empty Aisles)')
    : strategy === 'MULTI_COURSE_INTERLEAVED'
      ? 'Checkerboard Interleaving'
      : 'Sequential Fill';

  return (
    <div className="seating-module">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: '#1e1e2d',
            border: '1px solid rgba(245, 158, 11, 0.7)',
            borderRadius: '10px',
            padding: '0.85rem 1.4rem',
            color: '#fef3c7',
            boxShadow: '0 12px 35px rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.88rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <AlertTriangle size={18} color="#f59e0b" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Schedule Reset Confirmation Modal */}
      {scheduleResetModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
          onClick={() => setScheduleResetModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, #181926, #12131f)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.15)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setScheduleResetModal((prev) => ({ ...prev, isOpen: false }))}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--text-muted)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              title="Cancel & Dismiss"
            >
              ✕
            </button>

            {/* Header with Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-amber)',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                  {scheduleResetModal.title}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                  {scheduleResetModal.message}
                </p>
              </div>
            </div>

            {/* Existing Schedule Summary Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                Current Active Seating Arrangement:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {scheduleResetModal.examsToReset.map((ex) => (
                  <div
                    key={ex.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className="badge badge-indigo" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                        {ex.course_code}
                      </span>
                      <span style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        {ex.course_name || ex.exam_name}
                      </span>
                    </div>
                    <span className="badge badge-emerald" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                      {ex.allocated_seats_count || 0} Students Seated
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decision Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Option 1: Yes, Reset Schedule to Zero */}
              <button
                onClick={() => handleConfirmResetModal(true)}
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.28))',
                  border: '1px solid rgba(239, 68, 68, 0.6)',
                  borderRadius: '10px',
                  padding: '0.95rem 1.15rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(185, 28, 28, 0.45))';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.28))';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f87171',
                      flexShrink: 0
                    }}
                  >
                    <RotateCcw size={18} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.92rem', color: '#fca5a5' }}>
                      Yes, Reset Current Schedule (Make it Zero)
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'rgba(252, 165, 165, 0.75)' }}>
                      Clear all desks to zero allocations and start fresh with all students unseated
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} color="#fca5a5" />
              </button>

              {/* Option 2: No, Arrange Current Schedule in Manual Option */}
              <button
                onClick={() => handleConfirmResetModal(false)}
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.28))',
                  border: '1px solid rgba(16, 185, 129, 0.6)',
                  borderRadius: '10px',
                  padding: '0.95rem 1.15rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.35), rgba(5, 150, 105, 0.45))';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.28))';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.6)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#34d399',
                      flexShrink: 0
                    }}
                  >
                    <PenTool size={18} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.92rem', color: '#6ee7b7' }}>
                      No, Arrange Current Schedule in Manual Option
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'rgba(110, 231, 183, 0.75)' }}>
                      Keep current seating intact and arrange existing seated students on desks manually
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} color="#6ee7b7" />
              </button>
            </div>

            {/* Cancel text link */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                onClick={() => setScheduleResetModal((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Cancel and stay on current view
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module Header */}
      <div className="view-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <h1 className="view-title" style={{ margin: 0 }}>Smart Room & Seating Allocation</h1>
            <span className="badge badge-emerald">Module 4 Live</span>
          </div>
          <p className="view-subtitle" style={{ margin: 0 }}>
            Choose a subject, then auto-generate optimal anti-cheating seating or manually assign desks interactively.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Quick Access to Existing Seating Arrangements Archive */}
          <button
            className={`btn ${allocationMode === 'EXISTING_PLANS' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleSelectExistingPlansMode}
            title="View existing seating arrangements and manage or delete plans"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: allocationMode === 'EXISTING_PLANS' ? 'var(--primary)' : 'rgba(99, 102, 241, 0.12)',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              color: allocationMode === 'EXISTING_PLANS' ? '#fff' : '#818cf8',
              fontWeight: 600
            }}
          >
            <Layers size={16} />
            <span>Existing Seating Plans ({allocatedExamsCount})</span>
          </button>

          {exams.length === 0 && (
            <button className="btn btn-emerald" onClick={handleSeedDemoExams}>
              <Sparkles size={16} />
              <span>Create Demo Exams</span>
            </button>
          )}
          {/* Download CSV: Only visible after creating plan automatically or after saving in manual */}
          {((allocationMode === 'AUTOMATIC' && hasClickedGenerate && allocationData && allocationData.totalAllocated > 0) ||
            (allocationMode === 'MANUAL' && allocationData && allocationData.totalAllocated > 0)) && (
              <button
                className="btn btn-secondary"
                onClick={allocationMode === 'MANUAL' ? handleManualDownloadCSV : handleDownloadCSV}
                title="Download student seating plan as CSV"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'rgba(16, 185, 129, 0.12)',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                  color: 'var(--accent-emerald)',
                  fontWeight: 600
                }}
              >
                <Download size={16} />
                <span>Download CSV</span>
              </button>
            )}
        </div>
      </div>

      {/* Alert Feedback */}
      {feedback && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              feedback.type === 'error'
                ? 'rgba(244, 63, 94, 0.12)'
                : feedback.type === 'success'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(99, 102, 241, 0.12)',
            border: `1px solid ${feedback.type === 'error'
              ? 'rgba(244, 63, 94, 0.3)'
              : feedback.type === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(99, 102, 241, 0.3)'
              }`,
            color:
              feedback.type === 'error'
                ? 'var(--accent-rose)'
                : feedback.type === 'success'
                  ? 'var(--accent-emerald)'
                  : 'var(--text-main)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {feedback.type === 'error' ? (
              <AlertTriangle size={18} />
            ) : feedback.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <Info size={18} />
            )}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.2rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 1: CHOOSE SUBJECT / COURSE EXAMINATION */}
      {/* ========================================================= */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.35rem 1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <BookOpen size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Step 1: Choose Subject / Examination</h2>
          </div>
          {selectedExam && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge ${selectedExam.allocationStatus === 'FULLY_ALLOCATED' ? 'badge-emerald' : selectedExam.allocationStatus === 'PARTIALLY_ALLOCATED' ? 'badge-amber' : 'badge-indigo'}`}>
                {selectedExam.allocationStatus === 'FULLY_ALLOCATED' ? 'Fully Allocated' : selectedExam.allocationStatus === 'PARTIALLY_ALLOCATED' ? 'Partially Allocated' : 'Pending Seating'}
              </span>
              <span className="badge badge-cyan">
                {enrolledData ? `${enrolledData.totalStudents} Enrolled Students` : `${selectedExam.eligible_students_count} Enrolled`}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Select Subject Exam
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => handleExamChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.92rem',
                fontWeight: 600
              }}
            >
              <option value="">-- Choose Subject / Course Examination --</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id} style={{ background: '#111827', color: '#fff' }}>
                  {ex.course_code}: {ex.exam_name} ({ex.eligible_students_count} enrolled students)
                </option>
              ))}
            </select>
          </div>

          {selectedExam && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 1rem',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.72rem' }}>Department</span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedExam.department}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.72rem' }}>Semester</span>
                <strong style={{ color: 'var(--text-main)' }}>Semester {selectedExam.semester}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.72rem' }}>Date & Time</span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedExam.exam_date?.split('T')[0]} ({selectedExam.start_time?.substring(0, 5)})</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* When no subject is selected, show an inviting prompt */}
      {!selectedExamId && allocationMode !== 'EXISTING_PLANS' ? (
        <div
          className="card"
          style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '3rem 2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            marginBottom: '2rem'
          }}
        >
          <BookOpen size={40} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Please Choose a Subject / Course Examination First
          </h3>
          <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
            Select an exam from the Step 1 dropdown above to unlock the Automatic Seating Generator or Manual Seating Studio.
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* STEP 2: CHOOSE ALLOCATION METHOD (AUTOMATIC VS MANUAL) */}
          {/* ========================================================= */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Layers size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Step 2: Choose Allocation Method</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* Option A: Automatic Allocation */}
              <button
                onClick={handleSelectAutomaticMode}
                style={{
                  background: allocationMode === 'AUTOMATIC' ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(99, 102, 241, 0.08))' : 'var(--bg-card)',
                  border: `2px solid ${allocationMode === 'AUTOMATIC' ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: allocationMode === 'AUTOMATIC' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Sparkles size={20} color={allocationMode === 'AUTOMATIC' ? '#fff' : 'var(--primary)'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>Automatic Smart Allocation</strong>
                    {allocationMode === 'AUTOMATIC' && <span className="badge badge-indigo">Active</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Auto-generate seating using anti-cheating algorithms (Alternate Columns, Interleaving, Sequential) and room capacity scaling.
                  </p>
                </div>
              </button>

              {/* Option B: Manual Allocation */}
              <button
                onClick={handleSelectManualMode}
                style={{
                  background: allocationMode === 'MANUAL' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(6, 182, 212, 0.08))' : 'var(--bg-card)',
                  border: `2px solid ${allocationMode === 'MANUAL' ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: allocationMode === 'MANUAL' ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <PenTool size={20} color={allocationMode === 'MANUAL' ? '#fff' : 'var(--accent-emerald)'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>Manual Seating Studio</strong>
                    {allocationMode === 'MANUAL' && <span className="badge badge-emerald">Active</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Start with all desks non-positioned and manually place students from the unseated pool onto the 2D classroom grid.
                  </p>
                </div>
              </button>

              {/* Option C: Existing Seating Plans & Archive */}
              <button
                onClick={handleSelectExistingPlansMode}
                style={{
                  background: allocationMode === 'EXISTING_PLANS' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.08))' : 'var(--bg-card)',
                  border: `2px solid ${allocationMode === 'EXISTING_PLANS' ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: allocationMode === 'EXISTING_PLANS' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Layers size={20} color={allocationMode === 'EXISTING_PLANS' ? '#fff' : 'var(--primary)'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>Existing Seating Plans</strong>
                    {allocationMode === 'EXISTING_PLANS' ? (
                      <span className="badge badge-indigo">Active</span>
                    ) : (
                      <span className={`badge ${allocatedExamsCount > 0 ? 'badge-emerald' : 'badge-gray'}`}>
                        {allocatedExamsCount} Active
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Review all configured seating plans, see allocated rooms, export rosters, or delete seating arrangements.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MODE A: AUTOMATIC ALLOCATION VIEW */}
          {/* ========================================================= */}
          {allocationMode === 'AUTOMATIC' && (
            <>
              {/* Allocation Engine Configuration Panel */}
              <div
                className="card"
                style={{
                  background: 'var(--bg-card)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  marginBottom: '2rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  <Sparkles size={18} color="var(--primary)" />
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Automatic Seating Engine Settings</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {/* Anti-Cheating Strategy Selector */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      <span>Anti-Cheating Strategy</span>
                      {enableInterleaving && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                          <Lock size={12} /> Compulsory for 2 Papers
                        </span>
                      )}
                    </label>

                    <div
                      style={{ position: 'relative' }}
                      onClick={() => {
                        if (enableInterleaving) {
                          triggerTwoPaperStrategyNotice();
                        }
                      }}
                    >
                      {strategyPopover && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#1e1e2d',
                            border: '1px solid rgba(245, 158, 11, 0.85)',
                            color: '#fef3c7',
                            padding: '0.5rem 0.9rem',
                            borderRadius: '7px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            zIndex: 50,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            pointerEvents: 'none',
                            animation: 'fadeIn 0.15s ease-in-out'
                          }}
                        >
                          <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                          <span>In case of 2 papers in one room, this is the only available option.</span>
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 0,
                              height: 0,
                              borderLeft: '5px solid transparent',
                              borderRight: '5px solid transparent',
                              borderTop: '5px solid rgba(245, 158, 11, 0.85)'
                            }}
                          />
                        </div>
                      )}

                      <select
                        value={enableInterleaving ? 'ALTERNATE_COLUMNS' : strategy}
                        onChange={(e) => {
                          if (enableInterleaving) {
                            triggerTwoPaperStrategyNotice();
                          } else {
                            setStrategy(e.target.value);
                          }
                        }}
                        disabled={enableInterleaving}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: enableInterleaving ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                          border: enableInterleaving ? '1px dashed rgba(245, 158, 11, 0.5)' : '1px solid var(--border-subtle)',
                          color: 'var(--text-main)',
                          fontSize: '0.88rem',
                          cursor: enableInterleaving ? 'not-allowed' : 'pointer',
                          opacity: enableInterleaving ? 0.92 : 1
                        }}
                      >
                        {enableInterleaving ? (
                          <option value="ALTERNATE_COLUMNS" style={{ background: '#111827', color: '#fff' }}>
                            Alternate Columns Side-by-Side (Compulsory for 2 Papers)
                          </option>
                        ) : (
                          <>
                            <option value="ALTERNATE_COLUMNS" style={{ background: '#111827', color: '#fff' }}>
                              Alternate Column Seating (Recommended: Empty aisle buffers)
                            </option>
                            <option value="SEQUENTIAL" style={{ background: '#111827', color: '#fff' }}>
                              Sequential Fill (Fill every seat)
                            </option>
                          </>
                        )}
                      </select>

                      {enableInterleaving && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerTwoPaperStrategyNotice();
                          }}
                          title="In case of 2 papers in one room, this is the only available option."
                          style={{
                            position: 'absolute',
                            inset: 0,
                            cursor: 'not-allowed',
                            zIndex: 10
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Two-Paper Mixing Toggle */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      Two-Paper Mixing (Anti-Cheating)
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input
                          type="checkbox"
                          id="interleave-check"
                          checked={enableInterleaving}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setEnableInterleaving(isChecked);
                            setStrategy('ALTERNATE_COLUMNS');
                            if (isChecked && (!secondaryExamId || secondaryExamId.toString() === selectedExamId.toString())) {
                              const altExam = exams.find((ex) => ex.id.toString() !== selectedExamId.toString());
                              if (altExam) setSecondaryExamId(altExam.id.toString());
                            }
                          }}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <label htmlFor="interleave-check" style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-main)', cursor: 'pointer' }}>
                          Allow 2 different exam papers in the same room
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Exam Selector (Only if Interleaving is enabled) */}
                  {enableInterleaving && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        Second Course Exam (to alternate side-by-side)
                      </label>
                      <select
                        value={secondaryExamId}
                        onChange={(e) => setSecondaryExamId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-main)',
                          fontSize: '0.88rem'
                        }}
                      >
                        <option value="" style={{ background: '#111827', color: '#fff' }}>
                          -- Select 2nd Course Exam --
                        </option>
                        {exams
                          .filter((ex) => ex.id.toString() !== selectedExamId)
                          .map((ex) => (
                            <option key={ex.id} value={ex.id} style={{ background: '#111827', color: '#fff' }}>
                              {ex.course_code}: {ex.exam_name} ({ex.eligible_students_count} students)
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Room Allocation Options */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                    Room Capacity Allocation Mode:
                  </label>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name="roomMode"
                        checked={autoSelectRooms}
                        onChange={() => setAutoSelectRooms(true)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>Auto-Allocate Optimal Rooms by Capacity</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name="roomMode"
                        checked={!autoSelectRooms}
                        onChange={() => setAutoSelectRooms(false)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>Manual Room Selection</span>
                    </label>
                  </div>

                  {!autoSelectRooms && (
                    <>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                        {rooms.map((rm) => {
                          const isChecked = selectedRoomIds.includes(rm.id);
                          return (
                            <label
                              key={rm.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: isChecked ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-subtle)'}`,
                                padding: '0.5rem 0.85rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '0.82rem'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRoomIds([...selectedRoomIds, rm.id]);
                                  } else {
                                    setSelectedRoomIds(selectedRoomIds.filter((id) => id !== rm.id));
                                  }
                                }}
                                style={{ accentColor: 'var(--primary)' }}
                              />
                              <span>
                                {rm.room_number} ({rm.capacity} seats • {rm.rows_count}x{rm.cols_count})
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Live Capacity Validation for Manual Room Selection */}
                      <div style={{ marginTop: '0.85rem' }}>
                        {selectedRoomIds.length === 0 ? (
                          <div
                            style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(245, 158, 11, 0.1)',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              color: 'var(--accent-amber)',
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <AlertTriangle size={16} />
                            <span>Please select one or more classrooms to allocate.</span>
                          </div>
                        ) : autoManualUsableSeats < autoTotalStudentsNeeded ? (
                          <div
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(244, 63, 94, 0.12)',
                              border: '1.5px solid rgba(244, 63, 94, 0.45)',
                              color: 'var(--accent-rose)',
                              fontSize: '0.84rem',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.6rem'
                            }}
                          >
                            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                              <strong style={{ fontSize: '0.88rem', display: 'block', marginBottom: '0.2rem' }}>
                                ⚠️ In this much room this strategy can't be implemented
                              </strong>
                              <span style={{ fontSize: '0.78rem', color: '#fca5a5', lineHeight: 1.4 }}>
                                Selected room(s) provide <strong>{autoManualUsableSeats}</strong> usable seat(s) under <strong>'{autoStrategyLabel}'</strong>, but <strong>{autoTotalStudentsNeeded}</strong> student(s) need to be seated. Please select more rooms or choose a different strategy.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: 'var(--accent-emerald)',
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <CheckCircle2 size={16} />
                            <span>
                              Capacity Verified: Selected room(s) provide <strong>{autoManualUsableSeats}</strong> usable seat(s) for <strong>{autoTotalStudentsNeeded}</strong> student(s) under <strong>'{autoStrategyLabel}'</strong>.
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  {hasClickedGenerate && allocationData && allocationData.totalAllocated > 0 && (
                    <button className="btn btn-danger" onClick={handleClearAllocation}>
                      <RotateCcw size={16} />
                      <span>Clear Allocation</span>
                    </button>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={handleRunAllocation}
                    disabled={allocating || !selectedExamId}
                  >
                    <Sparkles size={16} />
                    <span>{allocating ? 'Computing Optimal Grid...' : 'Generate Seating Plan'}</span>
                  </button>
                </div>
              </div>

              {/* Results Area: Only displayed after user clicks Generate Seating Plan */}
              {hasClickedGenerate && allocationData && allocationData.totalAllocated > 0 ? (
                <>
                  {/* Real-time Integrity & Metric Summary Cards */}
                  <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card">
                      <div className="stat-card-header">
                        <span className="stat-title">Allocated Seats</span>
                        <Users size={18} color="var(--primary)" />
                      </div>
                      <div className="stat-value">
                        {allocationData.totalAllocated}
                      </div>
                      <div className="stat-subtitle">
                        {enableInterleaving && secondaryExamId ? (
                          `${allocationData.totalAllocated} students across 2 subjects`
                        ) : enrolledData ? (
                          `${enrolledData.totalStudents} total enrolled students`
                        ) : selectedExam ? (
                          `${selectedExam.eligible_students_count} eligible students`
                        ) : (
                          'Select an exam'
                        )}
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-card-header">
                        <span className="stat-title">Rooms Utilized</span>
                        <Building2 size={18} color="var(--accent-cyan)" />
                      </div>
                      <div className="stat-value">
                        {allocationData.rooms ? allocationData.rooms.length : 0}
                      </div>
                      <div className="stat-subtitle">Capacity-optimized placement</div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-card-header">
                        <span className="stat-title">Anti-Cheating Integrity</span>
                        <ShieldCheck size={18} color="var(--accent-emerald)" />
                      </div>
                      <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
                        100%
                      </div>
                      <div className="stat-subtitle">0 adjacent same-course conflicts</div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-card-header">
                        <span className="stat-title">Seating Parity</span>
                        <Grid size={18} color="var(--accent-amber)" />
                      </div>
                      <div className="stat-value">
                        {enableInterleaving
                          ? 'Alternate Papers Side-by-Side'
                          : strategy === 'ALTERNATE_COLUMNS' || strategy === 'CHECKERBOARD_SPACED'
                            ? 'Alternate Columns'
                            : strategy === 'MULTI_COURSE_INTERLEAVED'
                              ? 'Alternating Papers'
                              : 'Sequential'}
                      </div>

                    </div>
                  </div>

                  {/* Visual 2D Room Grid & Interactive Classroom Layout */}
                  <div
                    className="card"
                    style={{
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.5rem',
                      marginBottom: '2rem'
                    }}
                  >
                    {/* Room Selection Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Grid size={18} color="var(--accent-cyan)" />
                          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                            2D Classroom Seating Matrix
                          </h2>
                        </div>

                        {/* Badges for courses seated in this room */}
                        {roomCourses.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            {roomCourses.map((c) => {
                              const cs = getCourseColor(c.course_code);
                              return (
                                <span
                                  key={c.course_code}
                                  style={{
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '6px',
                                    background: cs.bg,
                                    border: `1px solid ${cs.border}`,
                                    color: cs.text,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                >
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: cs.border }}></span>
                                  {c.course_code} ({c.count} seats)
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {allocationData.rooms.map((rm) => (
                          <button
                            key={rm.room_id}
                            className={`tab-btn ${activeRoomId === rm.room_id ? 'active' : ''}`}
                            onClick={() => handleRoomTabClick(rm.room_id)}
                            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                          >
                            <Building2 size={14} />
                            <span>
                              {rm.room_number} ({rm.students?.length || 0} / {rm.capacity})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Blackboard Banner */}
                    <div
                      style={{
                        background: 'linear-gradient(180deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.9))',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.65rem 1rem',
                        textAlign: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: 'var(--text-muted)',
                        marginBottom: '1.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span>👨‍🏫 FRONT OF CLASSROOM • TEACHER'S DESK & BLACKBOARD</span>
                    </div>

                    {/* 2D Seating Desks Grid */}
                    {roomLayout && roomLayout.matrix ? (
                      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateRows: `repeat(${roomLayout.rows}, minmax(80px, auto))`,
                            gap: '12px',
                            minWidth: `${roomLayout.cols * 130}px`,
                            margin: '0 auto'
                          }}
                        >
                          {roomLayout.matrix.map((row, rIdx) => (
                            <div
                              key={rIdx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${roomLayout.cols}, 1fr)`,
                                gap: '12px'
                              }}
                            >
                              {row.map((seat, cIdx) => {
                                const colorStyle = seat.isOccupied
                                  ? getCourseColor(seat.course_code)
                                  : { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.06)', text: '#6b7280' };

                                return (
                                  <div
                                    key={cIdx}
                                    style={{
                                      background: colorStyle.bg,
                                      border: `1px ${seat.isOccupied ? 'solid' : 'dashed'} ${colorStyle.border}`,
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '0.65rem 0.5rem',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      minHeight: '82px',
                                      transition: 'var(--transition)',
                                      position: 'relative',
                                      cursor: seat.isOccupied ? 'pointer' : 'default'
                                    }}
                                    title={
                                      seat.isOccupied
                                        ? `${seat.student_name} (${seat.enrollment_no})\nCourse: ${seat.course_code} - ${seat.course_name}\nSeat: ${seat.seat_number}`
                                        : `Vacant Seat (${seat.seat_number})`
                                    }
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                                        R{seat.row_num}-C{seat.col_num}
                                      </span>
                                      {seat.isOccupied && (
                                        <span
                                          style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            padding: '0.1rem 0.35rem',
                                            borderRadius: '4px',
                                            background: colorStyle.border,
                                            color: '#fff'
                                          }}
                                        >
                                          {seat.course_code}
                                        </span>
                                      )}
                                    </div>

                                    {seat.isOccupied ? (
                                      <div>
                                        <div
                                          style={{
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            color: 'var(--text-main)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        >
                                          {seat.student_name}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: colorStyle.text, fontFamily: 'monospace' }}>
                                          #{seat.enrollment_no}
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', fontStyle: 'italic' }}>
                                        {!enableInterleaving && strategy === 'ALTERNATE_COLUMNS' && seat.col_num % 2 === 0 ? 'Empty Aisle (Buffer)' : 'Vacant Seat'}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        Loading classroom matrix...
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  className="card"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    marginBottom: '2rem'
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(79, 70, 229, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1.25rem',
                      border: '1px solid rgba(79, 70, 229, 0.25)'
                    }}
                  >
                    <Sparkles size={28} color="var(--primary)" />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Ready to Generate Seating Plan
                  </h3>
                  <p style={{ maxWidth: '520px', margin: '0 auto 1.5rem', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                    Configure your anti-cheating strategy above (e.g. <em>Alternate Column Seating</em>) and click the blue <strong>"Generate Seating Plan"</strong> button to compute and display the automated seating arrangement.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={handleRunAllocation}
                    disabled={allocating || !selectedExamId}
                    style={{ padding: '0.7rem 1.6rem', fontSize: '0.95rem', fontWeight: 600 }}
                  >
                    <Sparkles size={16} />
                    <span>{allocating ? 'Computing Optimal Grid...' : 'Generate Seating Plan'}</span>
                  </button>
                </div>
              )}

              {/* Student Seating Roster Table: Only displayed after clicking Generate */}
              {hasClickedGenerate && allocationData && allocationData.allocations && allocationData.allocations.length > 0 && (
                <div
                  className="card"
                  style={{
                    background: 'var(--bg-card)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={18} color="var(--primary)" />
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                        Seating Roster ({allocationData.allocations.length} Students Allocated)
                      </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <div className="search-box" style={{ maxWidth: '300px', width: '100%' }}>
                        <Search size={15} />
                        <input
                          type="text"
                          placeholder="Search name, enrollment #, seat..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button
                            className="search-clear-btn"
                            onClick={() => setSearchQuery('')}
                            title="Clear search"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={handleDownloadCSV}
                        title="Export seating roster as CSV"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(16, 185, 129, 0.12)',
                          borderColor: 'rgba(16, 185, 129, 0.35)',
                          color: 'var(--accent-emerald)',
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          padding: '0.52rem 0.85rem'
                        }}
                      >
                        <Download size={15} />
                        <span>Download CSV</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Seat Number</th>
                          <th>Room</th>
                          <th>Row / Col</th>
                          <th>Enrollment No</th>
                          <th>Student Name</th>
                          <th>Course</th>
                          <th>Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAllocations.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <span className="badge badge-indigo" style={{ fontWeight: 700 }}>
                                {item.seat_number}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: 'var(--text-main)' }}>{item.room_number}</strong>
                            </td>
                            <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                              Row {item.row_num}, Col {item.col_num}
                            </td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.enrollment_no}</span>
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.student_name}</td>
                            <td>
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '4px',
                                  background: getCourseColor(item.course_code).bg,
                                  border: `1px solid ${getCourseColor(item.course_code).border}`,
                                  color: getCourseColor(item.course_code).text
                                }}
                              >
                                {item.course_code}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{item.department}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* MODE B: MANUAL SEATING STUDIO VIEW */}
          {/* ========================================================= */}
          {allocationMode === 'MANUAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Manual Room Selector & Action Toolbar */}
              <div
                className="card"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem 1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        Select Classroom / Exam Hall:
                      </label>
                      <select
                        value={manualRoomId}
                        onChange={(e) => setManualRoomId(e.target.value)}
                        style={{
                          padding: '0.6rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-main)',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          minWidth: '220px'
                        }}
                      >
                        {rooms.map((rm) => (
                          <option key={rm.id} value={rm.id} style={{ background: '#111827', color: '#fff' }}>
                            {rm.room_number} ({rm.capacity} seats • {rm.rows_count}x{rm.cols_count}) - {rm.building}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2 Papers Option in One Room */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '1.2rem' }}>
                        <input
                          type="checkbox"
                          checked={manualTwoPaper}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            let secId = manualSecondaryExamId;
                            if (checked && (!secId || secId.toString() === selectedExamId.toString()) && exams.length > 1) {
                              const alt = exams.find((x) => x.id.toString() !== selectedExamId.toString());
                              if (alt) {
                                secId = alt.id.toString();
                                setManualSecondaryExamId(secId);
                              }
                            }

                            if (checked) {
                              const hasExisting = checkHasExistingSchedule(selectedExamId, secId, true);
                              if (hasExisting) {
                                const pExam = exams.find((x) => x.id.toString() === selectedExamId.toString());
                                const sExam = secId ? exams.find((x) => x.id.toString() === secId.toString()) : null;
                                const affected = [];
                                if (pExam && (pExam.allocated_seats_count || 0) > 0) affected.push(pExam);
                                if (sExam && (sExam.allocated_seats_count || 0) > 0) affected.push(sExam);

                                setScheduleResetModal({
                                  isOpen: true,
                                  title: 'Existing Seating Schedule Detected (2 Subjects)',
                                  message: 'Do you want to reset current schedule?',
                                  examsToReset: affected,
                                  actionType: 'TOGGLE_TWO_PAPER',
                                  targetExamId: selectedExamId,
                                  targetSecondaryExamId: secId,
                                  targetTwoPaper: true,
                                  targetRoomId: manualRoomId
                                });
                                return;
                              }
                              setManualTwoPaper(true);
                              await reloadManualData();
                            } else {
                              setManualTwoPaper(false);
                              await reloadManualData();
                            }
                          }}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <span>Allow 2 Exam Papers in this Room</span>
                      </label>
                    </div>

                    {manualTwoPaper && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '0.3rem' }}>
                          Second Course Exam (Right Panel):
                        </label>
                        <select
                          value={manualSecondaryExamId}
                          onChange={async (e) => {
                            const newSecId = e.target.value;
                            if (newSecId) {
                              const secExam = exams.find((ex) => ex.id.toString() === newSecId.toString());
                              if (secExam && (secExam.allocated_seats_count || 0) > 0) {
                                setScheduleResetModal({
                                  isOpen: true,
                                  title: 'Existing Seating Schedule Detected (Secondary Subject)',
                                  message: `Do you want to reset current schedule for ${secExam.course_code}?`,
                                  examsToReset: [secExam],
                                  actionType: 'CHANGE_SECONDARY',
                                  targetExamId: selectedExamId,
                                  targetSecondaryExamId: newSecId,
                                  targetTwoPaper: true,
                                  targetRoomId: manualRoomId
                                });
                                return;
                              }
                              setManualSecondaryExamId(newSecId);
                              await loadSecondaryEnrolledStudents(newSecId);
                              await loadManualRoomLayout(manualRoomId, `${selectedExamId},${newSecId}`, true);
                            }
                          }}
                          style={{
                            padding: '0.6rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: 'var(--text-main)',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            minWidth: '240px'
                          }}
                        >
                          <option value="" disabled>-- Select Secondary Exam --</option>
                          {exams
                            .filter((e) => e.id.toString() !== selectedExamId.toString())
                            .map((e) => (
                              <option key={e.id} value={e.id} style={{ background: '#111827', color: '#fff' }}>
                                {e.course_code} - {e.exam_name} ({e.exam_date ? new Date(e.exam_date).toLocaleDateString() : ''})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveManualSeating}
                      disabled={manualSaving || !selectedExamId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderColor: '#059669',
                        fontWeight: 600,
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                      }}
                      title="Save current seating plan to database"
                    >
                      <CheckCircle2 size={16} />
                      <span>{manualSaving ? 'Saving...' : 'Save Seating Plan'}</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleAutoFillRemainingManual}
                      disabled={manualSaving || (sub1Unseated === 0 && (!manualTwoPaper || sub2Unseated === 0))}
                      title="Auto-fill empty desks in this room with unseated students"
                    >
                      <Sparkles size={15} />
                      <span>Auto-Fill Desks</span>
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleClearRoomManual}
                      title="Clear all student seat placements in this room and return them to the student pool"
                    >
                      <RotateCcw size={15} />
                      <span>Clear Room (Reset Desks)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Studio Layout:
                  - If 2 Papers: 3 Columns [Subject 1 (Left)] [Room Map (Center)] [Subject 2 (Right)]
                  - If 1 Paper:  2 Columns [Subject 1 (Left)] [Room Map (Right)]
              */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: manualTwoPaper ? '310px minmax(440px, 1fr) 310px' : '350px 1fr',
                  gap: manualTwoPaper ? '1.25rem' : '1.5rem',
                  alignItems: 'start'
                }}
              >
                {/* ========================================================= */}
                {/* LEFT COLUMN: SUBJECT 1 (PRIMARY EXAM) STUDENT POOL */}
                {/* ========================================================= */}
                <div
                  className="card"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.15rem'
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: getCourseColor(sub1CourseCode).bg,
                            border: `1px solid ${getCourseColor(sub1CourseCode).border}`,
                            color: getCourseColor(sub1CourseCode).text
                          }}
                        >
                          {sub1CourseCode}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {manualTwoPaper ? 'Subject 1 (Left)' : 'Course Exam'}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', lineHeight: 1.3 }}>
                        {sub1CourseName}
                      </h3>
                    </div>
                  </div>

                  {/* Summary Counters: Total, Unseated, Seated */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.4rem',
                      marginBottom: '0.85rem',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      textAlign: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{sub1Total}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', fontWeight: 600 }}>Unseated</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{sub1Unseated}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Seated</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{sub1Seated}</div>
                    </div>
                  </div>

                  {/* Status Filter Tabs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <button
                      onClick={() => setManualFilter('ALL')}
                      style={{
                        padding: '0.4rem 0.2rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        background: manualFilter === 'ALL' ? 'rgba(79, 70, 229, 0.25)' : 'rgba(255,255,255,0.02)',
                        color: manualFilter === 'ALL' ? '#fff' : 'var(--text-dim)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      All ({sub1Total})
                    </button>
                    <button
                      onClick={() => setManualFilter('UNSEATED')}
                      style={{
                        padding: '0.4rem 0.2rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        background: manualFilter === 'UNSEATED' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.02)',
                        color: manualFilter === 'UNSEATED' ? 'var(--accent-amber)' : 'var(--text-dim)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Unseated ({sub1Unseated})
                    </button>
                    <button
                      onClick={() => setManualFilter('SEATED')}
                      style={{
                        padding: '0.4rem 0.2rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        background: manualFilter === 'SEATED' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.02)',
                        color: manualFilter === 'SEATED' ? 'var(--accent-emerald)' : 'var(--text-dim)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Seated ({sub1Seated})
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="search-box" style={{ marginBottom: '0.85rem', width: '100%' }}>
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder={`Filter ${sub1CourseCode} name, #...`}
                      value={manualSearchQuery}
                      onChange={(e) => setManualSearchQuery(e.target.value)}
                    />
                    {manualSearchQuery && (
                      <button
                        className="search-clear-btn"
                        onClick={() => setManualSearchQuery('')}
                        title="Clear filter"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Active Selected Student Banner (if selected student is from Sub 1) */}
                  {selectedStudentToSeat && selectedStudentToSeat.exam_id === parseInt(selectedExamId, 10) && (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.25), rgba(16, 185, 129, 0.15))',
                        border: '2px solid var(--accent-emerald)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.65rem',
                        marginBottom: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 700, display: 'block' }}>
                          👉 ACTIVE FOR PLACEMENT:
                        </span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          {selectedStudentToSeat.name}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>
                          #{selectedStudentToSeat.enrollment_no} • {selectedStudentToSeat.department}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedStudentToSeat(null)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.2rem' }}
                        title="Cancel selection"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {/* Student Cards List */}
                  <div style={{ maxHeight: '520px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.2rem' }}>
                    {filteredSub1Students.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                        {loading ? 'Loading students...' : 'No students found.'}
                      </div>
                    ) : (
                      filteredSub1Students.map((st) => {
                        const isSelected = selectedStudentToSeat?.id === st.id && selectedStudentToSeat?.exam_id === parseInt(selectedExamId, 10);
                        return (
                          <div
                            key={st.id}
                            onClick={() => {
                              if (!st.isAllocated) {
                                setSelectedStudentToSeat(isSelected ? null : {
                                  ...st,
                                  exam_id: parseInt(selectedExamId, 10),
                                  course_code: sub1CourseCode
                                });
                              }
                            }}
                            style={{
                              background: isSelected
                                ? 'rgba(79, 70, 229, 0.25)'
                                : st.isAllocated
                                  ? 'rgba(16, 185, 129, 0.04)'
                                  : 'rgba(245, 158, 11, 0.05)',
                              border: `1px solid ${isSelected
                                ? 'var(--primary)'
                                : st.isAllocated
                                  ? 'rgba(16, 185, 129, 0.25)'
                                  : 'rgba(245, 158, 11, 0.25)'
                                }`,
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.55rem 0.75rem',
                              cursor: st.isAllocated ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'var(--transition)'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                {st.name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                #{st.enrollment_no} • {st.department}
                              </div>
                            </div>

                            {st.isAllocated ? (
                              <span
                                className="badge badge-emerald"
                                style={{ fontSize: '0.65rem', fontWeight: 700 }}
                                title={`Seated in ${st.seat_number}`}
                              >
                                {st.seat_number}
                              </span>
                            ) : (
                              <span
                                className="badge badge-amber"
                                style={{ fontSize: '0.65rem', cursor: 'pointer' }}
                              >
                                {isSelected ? 'Click Desk' : '+ Select'}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* CENTER COLUMN: INTERACTIVE 2D CLASSROOM ROOM MAP */}
                {/* ========================================================= */}
                <div
                  className="card"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    minWidth: 0
                  }}
                >
                  {/* Room Header & Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Room {rooms.find((r) => r.id.toString() === manualRoomId.toString())?.room_number || manualRoomId}
                      </h3>
                      {manualLayout && (
                        <span className="badge badge-indigo">
                          {manualLayout.occupiedSeats} / {manualLayout.totalSeats} Desks Occupied ({manualLayout.occupancyRate})
                        </span>
                      )}
                    </div>

                    {/* Color Legend for Subjects */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: getCourseColor(sub1CourseCode).bg,
                          border: `1px solid ${getCourseColor(sub1CourseCode).border}`,
                          color: getCourseColor(sub1CourseCode).text
                        }}
                      >
                        ● {sub1CourseCode}
                      </span>
                      {manualTwoPaper && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: getCourseColor(sub2CourseCode).bg,
                            border: `1px solid ${getCourseColor(sub2CourseCode).border}`,
                            color: getCourseColor(sub2CourseCode).text
                          }}
                        >
                          ● {sub2CourseCode}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px dashed var(--border-subtle)',
                          color: 'var(--text-dim)'
                        }}
                      >
                        ○ Vacant Desk
                      </span>
                    </div>
                  </div>

                  {/* Blackboard Banner */}
                  <div
                    style={{
                      background: 'linear-gradient(180deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.9))',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.65rem 1rem',
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: 'var(--text-muted)',
                      marginBottom: '1rem'
                    }}
                  >
                    <span>👨‍🏫 FRONT OF CLASSROOM • TEACHER'S DESK & BLACKBOARD</span>
                  </div>

                  {/* Placement instructions banner */}
                  <div
                    style={{
                      background: selectedStudentToSeat ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px dashed ${selectedStudentToSeat ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.78rem',
                      color: selectedStudentToSeat ? 'var(--accent-emerald)' : 'var(--text-dim)',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Info size={14} />
                    <span>
                      {selectedStudentToSeat
                        ? `Click any vacant desk below to seat ${selectedStudentToSeat.name} (${selectedStudentToSeat.course_code || ''} • #${selectedStudentToSeat.enrollment_no}).`
                        : manualTwoPaper
                          ? 'Click an unseated student on the Left (Subject 1) or Right (Subject 2) to select, then click a vacant desk below to seat them. Click ✕ on an occupied desk to unseat.'
                          : 'Click an unseated student on the left to select them, then click a vacant desk below to seat them. Click ✕ on an occupied desk to unseat.'}
                    </span>
                  </div>

                  {/* Interactive 2D Grid */}
                  {manualLayout && manualLayout.matrix ? (
                    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateRows: `repeat(${manualLayout.rows}, minmax(85px, auto))`,
                          gap: '12px',
                          minWidth: `${manualLayout.cols * 135}px`,
                          margin: '0 auto'
                        }}
                      >
                        {manualLayout.matrix.map((row, rIdx) => (
                          <div
                            key={rIdx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${manualLayout.cols}, 1fr)`,
                              gap: '12px'
                            }}
                          >
                            {row.map((seat, cIdx) => {
                              const isOccupied = seat.isOccupied;
                              const colorStyle = isOccupied
                                ? getCourseColor(seat.course_code)
                                : { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.06)', text: '#6b7280' };

                              const isPlacementTarget = !isOccupied && selectedStudentToSeat;

                              return (
                                <div
                                  key={cIdx}
                                  onClick={() => handleManualDeskClick(seat.row_num, seat.col_num, seat)}
                                  style={{
                                    background: isPlacementTarget ? 'rgba(16, 185, 129, 0.12)' : colorStyle.bg,
                                    border: `1.5px ${isPlacementTarget ? 'dashed' : isOccupied ? 'solid' : 'dashed'} ${isPlacementTarget ? 'var(--accent-emerald)' : colorStyle.border}`,
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '0.65rem 0.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '85px',
                                    transition: 'var(--transition)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    boxShadow: isPlacementTarget ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                                  }}
                                  title={
                                    isOccupied
                                      ? `${seat.student_name} (${seat.enrollment_no})\nCourse: ${seat.course_code}\nClick ✕ to unseat`
                                      : isPlacementTarget
                                        ? `Click to place ${selectedStudentToSeat.name}`
                                        : `Vacant Desk R${seat.row_num}-C${seat.col_num}`
                                  }
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                                      R{seat.row_num}-C{seat.col_num}
                                    </span>
                                    {isOccupied && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleManualDeskClick(seat.row_num, seat.col_num, seat);
                                        }}
                                        style={{
                                          background: 'rgba(244, 63, 94, 0.2)',
                                          border: 'none',
                                          color: 'var(--accent-rose)',
                                          borderRadius: '4px',
                                          padding: '0.1rem 0.25rem',
                                          cursor: 'pointer',
                                          fontSize: '0.65rem'
                                        }}
                                        title="Unseat Student"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>

                                  {isOccupied ? (
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
                                        <span
                                          style={{
                                            fontSize: '0.62rem',
                                            fontWeight: 700,
                                            padding: '0.1rem 0.35rem',
                                            borderRadius: '3px',
                                            background: colorStyle.bg,
                                            border: `1px solid ${colorStyle.border}`,
                                            color: colorStyle.text,
                                            display: 'inline-block'
                                          }}
                                        >
                                          {seat.course_code}
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          color: 'var(--text-main)',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis'
                                        }}
                                      >
                                        {seat.student_name}
                                      </div>
                                      <div style={{ fontSize: '0.68rem', color: colorStyle.text, fontFamily: 'monospace' }}>
                                        #{seat.enrollment_no}
                                      </div>
                                    </div>
                                  ) : isPlacementTarget ? (
                                    <div style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)', fontWeight: 600, textAlign: 'center' }}>
                                      + Place {selectedStudentToSeat.name.split(' ')[0]}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', fontStyle: 'italic' }}>
                                      Vacant Desk
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Grid Footer with Save Seating Plan & CSV button */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '1.25rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid var(--border-subtle)',
                          flexWrap: 'wrap',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          💡 <strong style={{ color: 'var(--text-main)' }}>Tip:</strong> Select an unseated student on the {manualTwoPaper ? 'left or right' : 'left'}, then click an empty desk to seat them. Click <strong style={{ color: 'var(--accent-emerald)' }}>Save Seating Plan</strong> to commit.
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-primary"
                            onClick={handleSaveManualSeating}
                            disabled={manualSaving || !selectedExamId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              borderColor: '#059669',
                              fontWeight: 600,
                              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                            }}
                          >
                            <CheckCircle2 size={16} />
                            <span>{manualSaving ? 'Saving...' : 'Save Seating Plan'}</span>
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={handleManualDownloadCSV}
                            disabled={manualSaving || !selectedExamId}
                            title="Save current seating plan and download CSV"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              background: 'rgba(16, 185, 129, 0.12)',
                              borderColor: 'rgba(16, 185, 129, 0.35)',
                              color: 'var(--accent-emerald)',
                              fontWeight: 600
                            }}
                          >
                            <Download size={15} />
                            <span>{manualSaving ? 'Saving & Exporting...' : 'Download CSV'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Loading room desk layout...
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* RIGHT COLUMN: SUBJECT 2 (SECONDARY EXAM) STUDENT POOL */}
                {/* ========================================================= */}
                {manualTwoPaper && (
                  <div
                    className="card"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.15rem'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: getCourseColor(sub2CourseCode).bg,
                              border: `1px solid ${getCourseColor(sub2CourseCode).border}`,
                              color: getCourseColor(sub2CourseCode).text
                            }}
                          >
                            {sub2CourseCode}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
                            Subject 2 (Right)
                          </span>
                        </div>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', lineHeight: 1.3 }}>
                          {sub2CourseName}
                        </h3>
                      </div>
                    </div>

                    {/* Summary Counters: Total, Unseated, Seated */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.4rem',
                        marginBottom: '0.85rem',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        textAlign: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{sub2Total}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', fontWeight: 600 }}>Unseated</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{sub2Unseated}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Seated</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{sub2Seated}</div>
                      </div>
                    </div>

                    {/* Status Filter Tabs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      <button
                        onClick={() => setSub2Filter('ALL')}
                        style={{
                          padding: '0.4rem 0.2rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          background: sub2Filter === 'ALL' ? 'rgba(79, 70, 229, 0.25)' : 'rgba(255,255,255,0.02)',
                          color: sub2Filter === 'ALL' ? '#fff' : 'var(--text-dim)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        All ({sub2Total})
                      </button>
                      <button
                        onClick={() => setSub2Filter('UNSEATED')}
                        style={{
                          padding: '0.4rem 0.2rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          background: sub2Filter === 'UNSEATED' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.02)',
                          color: sub2Filter === 'UNSEATED' ? 'var(--accent-amber)' : 'var(--text-dim)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Unseated ({sub2Unseated})
                      </button>
                      <button
                        onClick={() => setSub2Filter('SEATED')}
                        style={{
                          padding: '0.4rem 0.2rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          background: sub2Filter === 'SEATED' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.02)',
                          color: sub2Filter === 'SEATED' ? 'var(--accent-emerald)' : 'var(--text-dim)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Seated ({sub2Seated})
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="search-box" style={{ marginBottom: '0.85rem', width: '100%' }}>
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder={`Filter ${sub2CourseCode} name, #...`}
                        value={sub2SearchQuery}
                        onChange={(e) => setSub2SearchQuery(e.target.value)}
                      />
                      {sub2SearchQuery && (
                        <button
                          className="search-clear-btn"
                          onClick={() => setSub2SearchQuery('')}
                          title="Clear filter"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Active Selected Student Banner (if selected student is from Sub 2) */}
                    {selectedStudentToSeat && selectedStudentToSeat.exam_id === parseInt(manualSecondaryExamId, 10) && (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.25), rgba(16, 185, 129, 0.15))',
                          border: '2px solid var(--accent-emerald)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.65rem',
                          marginBottom: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 700, display: 'block' }}>
                            👉 ACTIVE FOR PLACEMENT:
                          </span>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            {selectedStudentToSeat.name}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>
                            #{selectedStudentToSeat.enrollment_no} • {selectedStudentToSeat.department}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedStudentToSeat(null)}
                          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.2rem' }}
                          title="Cancel selection"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}

                    {/* Student Cards List */}
                    <div style={{ maxHeight: '520px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.2rem' }}>
                      {filteredSub2Students.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                          {loading ? 'Loading students...' : !secondaryEnrolledData ? 'Select a secondary exam above.' : 'No students found.'}
                        </div>
                      ) : (
                        filteredSub2Students.map((st) => {
                          const isSelected = selectedStudentToSeat?.id === st.id && selectedStudentToSeat?.exam_id === parseInt(manualSecondaryExamId, 10);
                          return (
                            <div
                              key={st.id}
                              onClick={() => {
                                if (!st.isAllocated) {
                                  setSelectedStudentToSeat(isSelected ? null : {
                                    ...st,
                                    exam_id: parseInt(manualSecondaryExamId, 10),
                                    course_code: sub2CourseCode
                                  });
                                }
                              }}
                              style={{
                                background: isSelected
                                  ? 'rgba(79, 70, 229, 0.25)'
                                  : st.isAllocated
                                    ? 'rgba(16, 185, 129, 0.04)'
                                    : 'rgba(245, 158, 11, 0.05)',
                                border: `1px solid ${isSelected
                                  ? 'var(--primary)'
                                  : st.isAllocated
                                    ? 'rgba(16, 185, 129, 0.25)'
                                    : 'rgba(245, 158, 11, 0.25)'
                                  }`,
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.55rem 0.75rem',
                                cursor: st.isAllocated ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'var(--transition)'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                  {st.name}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                  #{st.enrollment_no} • {st.department}
                                </div>
                              </div>

                              {st.isAllocated ? (
                                <span
                                  className="badge badge-emerald"
                                  style={{ fontSize: '0.65rem', fontWeight: 700 }}
                                  title={`Seated in ${st.seat_number}`}
                                >
                                  {st.seat_number}
                                </span>
                              ) : (
                                <span
                                  className="badge badge-amber"
                                  style={{ fontSize: '0.65rem', cursor: 'pointer' }}
                                >
                                  {isSelected ? 'Click Desk' : '+ Select'}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ALLOCATION MODE C: EXISTING SEATING ARRANGEMENTS & ARCHIVE */}
          {/* ========================================================= */}
          {allocationMode === 'EXISTING_PLANS' && (
            <div style={{ marginTop: '0.5rem', animation: 'fadeIn 0.2s ease-in-out' }}>
              {/* Management Header Card */}
              <div
                className="card"
                style={{
                  background: 'var(--bg-card)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={22} color="var(--primary)" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Configured Seating Plans Archive
                      </h2>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Inspect active seating plans across examination courses, view room distributions, download CSV rosters, or delete seating arrangements.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={handleSelectAutomaticMode}
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                    >
                      <Sparkles size={14} />
                      <span>New Auto Allocation</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleSelectManualMode}
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                    >
                      <PenTool size={14} />
                      <span>Manual Studio</span>
                    </button>
                    {allocatedExamsCount > 0 && (
                      <button
                        className="btn btn-danger"
                        onClick={handleClearAllArrangements}
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                        title="Delete all active seating plans across all exams"
                      >
                        <Trash2 size={14} />
                        <span>Delete All Plans ({allocatedExamsCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Overview Stat Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Total Examinations</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>{exams.length}</div>
                  </div>
                  <div style={{ padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Active Seating Plans</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {allocatedExamsCount} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {exams.length}</span>
                    </div>
                  </div>
                  <div style={{ padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Total Students Seated</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#818cf8' }}>
                      {totalStudentsSeatedAcrossExams} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>students</span>
                    </div>
                  </div>
                  <div style={{ padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Pending Seating</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{pendingExamsCount}</div>
                  </div>
                </div>

                {/* Filter and Search Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                  {/* Search input */}
                  <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '420px' }}>
                    <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search by course code, title, room..."
                      value={arrangementsSearch}
                      onChange={(e) => setArrangementsSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.85rem 0.55rem 2.25rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem'
                      }}
                    />
                    {arrangementsSearch && (
                      <button
                        onClick={() => setArrangementsSearch('')}
                        style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0, 0, 0, 0.25)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => setArrangementsFilter('ALLOCATED')}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: arrangementsFilter === 'ALLOCATED' ? 'var(--primary)' : 'transparent',
                        color: arrangementsFilter === 'ALLOCATED' ? '#fff' : 'var(--text-muted)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Active Plans ({allocatedExamsCount})
                    </button>
                    <button
                      onClick={() => setArrangementsFilter('ALL')}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: arrangementsFilter === 'ALL' ? 'var(--primary)' : 'transparent',
                        color: arrangementsFilter === 'ALL' ? '#fff' : 'var(--text-muted)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      All Exams ({exams.length})
                    </button>
                    <button
                      onClick={() => setArrangementsFilter('PENDING')}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: arrangementsFilter === 'PENDING' ? 'var(--primary)' : 'transparent',
                        color: arrangementsFilter === 'PENDING' ? '#fff' : 'var(--text-muted)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Pending ({pendingExamsCount})
                    </button>
                  </div>
                </div>
              </div>

              {/* List of Seating Plans */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {filteredArrangements.length === 0 ? (
                  <div
                    style={{
                      padding: '3rem 2rem',
                      textAlign: 'center',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--border-subtle)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <Layers size={36} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '0.75rem' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      No Seating Plans Found
                    </h3>
                    <p style={{ fontSize: '0.82rem', margin: 0, maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
                      {arrangementsFilter === 'ALLOCATED'
                        ? 'No active seating arrangements have been generated yet. Use the Automatic Generator or Manual Studio to create one.'
                        : 'No examinations match your search query.'}
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={handleSelectAutomaticMode}
                      style={{ fontSize: '0.84rem' }}
                    >
                      <Sparkles size={14} />
                      <span>Generate Smart Seating Plan</span>
                    </button>
                  </div>
                ) : (
                  filteredArrangements.map((ex) => {
                    const hasAllocations = (ex.allocated_seats_count || 0) > 0;
                    return (
                      <div
                        key={ex.id}
                        className="card"
                        style={{
                          background: 'var(--bg-card)',
                          backdropFilter: 'blur(12px)',
                          border: hasAllocations ? '1px solid rgba(99, 102, 241, 0.28)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1.25rem 1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1.25rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Left: Exam and Course Metadata */}
                        <div style={{ flex: '1 1 300px', minWidth: '260px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                            <span className="badge badge-indigo" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                              {ex.course_code}
                            </span>
                            <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>
                              {ex.exam_name}
                            </strong>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span>📚 {ex.course_name}</span>
                            <span>•</span>
                            <span>🏛️ {ex.department} - Sem {ex.semester}</span>
                            <span>•</span>
                            <span>📅 {ex.exam_date ? new Date(ex.exam_date).toLocaleDateString() : 'TBD'} ({ex.start_time || '09:30'} - {ex.end_time || '12:30'})</span>
                          </div>
                        </div>

                        {/* Middle: Seating Status & Allocated Rooms */}
                        <div style={{ flex: '0 0 auto', minWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                            <span className={`badge ${ex.allocationStatus === 'FULLY_ALLOCATED' ? 'badge-emerald' : ex.allocationStatus === 'PARTIALLY_ALLOCATED' ? 'badge-amber' : 'badge-gray'}`}>
                              {ex.allocationStatus === 'FULLY_ALLOCATED' ? 'Fully Allocated' : ex.allocationStatus === 'PARTIALLY_ALLOCATED' ? 'Partially Allocated' : 'Pending Seating'}
                            </span>
                            <strong style={{ fontSize: '0.85rem', color: hasAllocations ? 'var(--text-main)' : 'var(--text-dim)' }}>
                              {ex.allocated_seats_count || 0} / {ex.eligible_students_count || 0} Seated
                            </strong>
                          </div>

                          {/* Allocated Rooms details */}
                          {hasAllocations ? (
                            <div style={{ fontSize: '0.76rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Building2 size={13} />
                              <span>
                                Rooms: <strong>{ex.allocated_room_numbers || `${ex.allocated_rooms_count} room(s)`}</strong>
                              </span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                              No classroom desks assigned yet
                            </div>
                          )}
                        </div>

                        {/* Right: Actions (View Layout, Download CSV, Delete Arrangement) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {hasAllocations ? (
                            <>
                              <button
                                className={expandedExamId === ex.id ? "btn btn-primary" : "btn btn-secondary"}
                                onClick={() => handleToggleExamSeatingList(ex)}
                                title={expandedExamId === ex.id ? "Hide student seating roster" : "View complete student seating roster list"}
                                style={{
                                  fontSize: '0.82rem',
                                  padding: '0.45rem 0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  background: expandedExamId === ex.id ? 'var(--primary)' : 'rgba(99, 102, 241, 0.1)',
                                  borderColor: 'rgba(99, 102, 241, 0.4)',
                                  color: expandedExamId === ex.id ? '#fff' : '#a5b4fc'
                                }}
                              >
                                <List size={14} />
                                <span>{expandedExamId === ex.id ? 'Hide Seating List' : 'View Seating List'}</span>
                                {expandedExamId === ex.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>

                              <button
                                className="btn btn-secondary"
                                onClick={() => handleDownloadExamCSV(ex)}
                                title="Download seating plan as CSV"
                                style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.35)' }}
                              >
                                <Download size={14} />
                                <span>CSV Roster</span>
                              </button>

                              <button
                                className="btn btn-danger"
                                disabled={deletingExamId === ex.id}
                                onClick={() => handleDeleteArrangement(ex)}
                                title="Delete this seating plan and return all students to the unseated pool"
                                style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              >
                                <Trash2 size={14} />
                                <span>{deletingExamId === ex.id ? 'Deleting...' : 'Delete Plan'}</span>
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setSelectedExamId(ex.id.toString());
                                setAllocationMode('AUTOMATIC');
                                showToast(`Selected ${ex.course_code}: click 'Generate Seating Plan' to allocate seats.`);
                              }}
                              title="Configure and auto-generate seating for this exam"
                              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                              <Sparkles size={14} color="var(--primary)" />
                              <span>Create Seating Plan</span>
                            </button>
                          )}
                        </div>

                        {/* Inline Seating Matrix List View (No 2D classroom visualizer needed, only roster list) */}
                        {hasAllocations && expandedExamId === ex.id && (
                          <div
                            style={{
                              width: '100%',
                              marginTop: '1.15rem',
                              padding: '1.25rem',
                              background: 'rgba(0, 0, 0, 0.35)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              borderRadius: 'var(--radius-sm)',
                              animation: 'fadeIn 0.2s ease-in-out'
                            }}
                          >
                            {/* Toolbar */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <span className="badge badge-indigo" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                                  {ex.course_code}
                                </span>
                                <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                  Configured Seating Roster ({ex.allocated_seats_count || 0} Students)
                                </strong>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                                {/* Search input */}
                                <div style={{ position: 'relative' }}>
                                  <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
                                  <input
                                    type="text"
                                    placeholder="Search student or seat..."
                                    value={examListSearchMap[ex.id] || ''}
                                    onChange={(e) => setExamListSearchMap((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                                    style={{
                                      padding: '0.4rem 0.65rem 0.4rem 2rem',
                                      borderRadius: 'var(--radius-sm)',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid var(--border-subtle)',
                                      color: 'var(--text-main)',
                                      fontSize: '0.78rem',
                                      width: '210px'
                                    }}
                                  />
                                </div>

                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleDownloadExamCSV(ex)}
                                  style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                >
                                  <Download size={13} />
                                  <span>Export CSV</span>
                                </button>
                              </div>
                            </div>

                            {/* Seating Table */}
                            {loadingExamAllocationsId === ex.id ? (
                              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Loading seating list...
                              </div>
                            ) : (() => {
                              const allSeated = examAllocationsMap[ex.id] || [];
                              const q = (examListSearchMap[ex.id] || '').toLowerCase().trim();
                              const filtered = q
                                ? allSeated.filter((st) =>
                                    st.student_name?.toLowerCase().includes(q) ||
                                    st.enrollment_no?.toLowerCase().includes(q) ||
                                    st.seat_number?.toLowerCase().includes(q) ||
                                    st.room_number?.toLowerCase().includes(q) ||
                                    st.department?.toLowerCase().includes(q)
                                  )
                                : allSeated;

                              if (filtered.length === 0) {
                                return (
                                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                                    {q ? 'No students match your search query.' : 'No seat allocations found for this exam.'}
                                  </div>
                                );
                              }

                              return (
                                <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
                                  <table className="table" style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', width: '45px' }}>#</th>
                                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left' }}>Student Name</th>
                                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left' }}>Enrollment / Roll No</th>
                                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left' }}>Department</th>
                                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left' }}>Classroom / Hall</th>
                                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left' }}>Seat Number</th>
                                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left' }}>Desk Position</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filtered.map((st, sIdx) => (
                                        <tr key={st.id || sIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-dim)' }}>{sIdx + 1}</td>
                                          <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>{st.student_name}</td>
                                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{st.enrollment_no}</td>
                                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-muted)' }}>{st.department} {st.semester ? `(Sem ${st.semester})` : ''}</td>
                                          <td style={{ padding: '0.55rem 0.75rem' }}>
                                            <span className="badge badge-indigo" style={{ fontSize: '0.74rem' }}>
                                              🏛️ {st.room_number || `Room ${st.room_id}`}
                                            </span>
                                          </td>
                                          <td style={{ padding: '0.55rem 0.75rem' }}>
                                            <span className="badge badge-emerald" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                                              🪑 {st.seat_number}
                                            </span>
                                          </td>
                                          <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-dim)', fontSize: '0.74rem' }}>
                                            Row {st.row_num}, Col {st.col_num}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
