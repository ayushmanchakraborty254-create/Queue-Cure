import React, { useState, useEffect } from 'react';
import { 
  supabase, 
  isSupabaseConfigured 
} from './supabaseClient';
import { 
  UserPlus, 
  Play, 
  Check,
  Clock, 
  ShieldAlert,
  Activity, 
  Users,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Download,
  BookOpen,
  FileText
} from 'lucide-react';
import { downloadSessionReport } from './utils/docxGenerator';

// Pre-seeded mock data for Demo Mode
const MOCK_INITIAL_QUEUE = [
  { id: '1', patient_name: 'David Miller', token_number: 1, doctor_name: 'Dr. Sarah Jenkins', status: 'in-consultation', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', patient_name: 'Emily Watson', token_number: 2, doctor_name: 'Dr. James Carter', status: 'waiting', created_at: new Date(Date.now() - 2400000).toISOString() },
  { id: '3', patient_name: 'Robert Downey', token_number: 3, doctor_name: 'Dr. Elena Rostova', status: 'waiting', created_at: new Date(Date.now() - 1200000).toISOString() },
  { id: '4', patient_name: 'Sarah Connor', token_number: 4, doctor_name: 'Dr. Marcus Vance', status: 'waiting', created_at: new Date(Date.now() - 600000).toISOString() },
  { id: '5', patient_name: 'Bruce Wayne', token_number: 5, doctor_name: 'Dr. Robert Chen', status: 'waiting', created_at: new Date(Date.now() - 300000).toISOString() },
  { id: '6', patient_name: 'Clark Kent', token_number: 6, doctor_name: 'Dr. Lisa Kudrow', status: 'waiting', created_at: new Date(Date.now() - 100000).toISOString() }
];

const MOCK_INITIAL_SETTINGS = {
  current_serving_token: 1,
  avg_consultation_time: 15
};

const MOCK_DOCTORS = [
  { id: 1, name: 'Dr. Sarah Jenkins', department: 'Cardiology', isBusy: true },
  { id: 2, name: 'Dr. James Carter', department: 'Pediatrics', isBusy: true },
  { id: 3, name: 'Dr. Elena Rostova', department: 'Neurology', isBusy: true },
  { id: 4, name: 'Dr. Marcus Vance', department: 'Orthopedics', isBusy: true },
  { id: 5, name: 'Dr. Robert Chen', department: 'Dermatology', isBusy: false },
  { id: 6, name: 'Dr. Lisa Kudrow', department: 'Psychiatry', isBusy: false },
  { id: 7, name: 'Dr. Alan Grant', department: 'General Medicine', isBusy: false },
  { id: 8, name: 'Dr. Amanda Reyes', department: 'Oncology', isBusy: false }
];

export default function App() {
  // Application State
  const [queue, setQueue] = useState([]);
  const [settings, setSettings] = useState({ current_serving_token: 0, avg_consultation_time: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Input fields state
  const [newPatientName, setNewPatientName] = useState('');
  const [avgConsultTime, setAvgConsultTime] = useState(15);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Custom added states
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [roomNumber, setRoomNumber] = useState('Room 101');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [editPatientName, setEditPatientName] = useState('');
  const [editPatientToken, setEditPatientToken] = useState('');

  // Doctor Dashboard State
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(false);
  const [loggedInDoctor, setLoggedInDoctor] = useState(null);
  const [docPhone, setDocPhone] = useState('');
  const [docName, setDocName] = useState('');
  const [docDept, setDocDept] = useState('');
  const [docChamber, setDocChamber] = useState('');
  const [activeTab, setActiveTab] = useState('reception'); // 'reception' | 'doctor'
  const [docSuggestions, setDocSuggestions] = useState([]);
  const [detectedDoctor, setDetectedDoctor] = useState(null);
  const [doctorsList, setDoctorsList] = useState(() => {
    const savedDocs = localStorage.getItem('qc_doctors');
    return savedDocs ? JSON.parse(savedDocs) : MOCK_DOCTORS.map(d => ({ ...d, accepting: true }));
  });

  const [sessionHistory, setSessionHistory] = useState(() => {
    const saved = localStorage.getItem('qc_session_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
    const demoHistory = [{
      id: 'demo-session-1',
      sessionName: 'Cardiology Morning OPD',
      doctorName: 'Dr. Sarah Jenkins',
      department: 'Cardiology',
      chamber: 'Room 102',
      startTime: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
      endTime: new Date(Date.now() - 3600000 * 2.5).toISOString(), // 2.5 hours ago
      attendedPatients: [
        { patient_name: 'David Miller', token_number: 1, prescriptionNo: 'RX-CARD-1002' },
        { patient_name: 'Emily Watson', token_number: 2, prescriptionNo: 'RX-CARD-1003' },
        { patient_name: 'Bruce Wayne', token_number: 5, prescriptionNo: 'RX-CARD-1004' }
      ],
      unattendedPatients: [
        { patient_name: 'Clark Kent', token_number: 6 }
      ]
    }];
    localStorage.setItem('qc_session_history', JSON.stringify(demoHistory));
    return demoHistory;
  });

  const [activeSessions, setActiveSessions] = useState(() => {
    const saved = localStorage.getItem('qc_active_sessions');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentPrescriptionNo, setCurrentPrescriptionNo] = useState('');
  const [sessionNameInput, setSessionNameInput] = useState('');

  useEffect(() => {
    localStorage.setItem('qc_doctors', JSON.stringify(doctorsList));
  }, [doctorsList]);

  useEffect(() => {
    localStorage.setItem('qc_session_history', JSON.stringify(sessionHistory));
  }, [sessionHistory]);

  useEffect(() => {
    localStorage.setItem('qc_active_sessions', JSON.stringify(activeSessions));
  }, [activeSessions]);

  // Notifications helper
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // 1. Initial Load of settings and queue
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isSupabaseConfigured) {
        let { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (!settingsData && !settingsError) {
          const { data: newSettings, error: insertError } = await supabase
            .from('settings')
            .insert([{ id: 1, current_serving_token: 0, avg_consultation_time: 15 }])
            .select()
            .single();
          
          if (insertError) throw insertError;
          settingsData = newSettings;
        } else if (settingsError) {
          throw settingsError;
        }

        const { data: queueData, error: queueError } = await supabase
          .from('queue')
          .select('*')
          .order('token_number', { ascending: true });

        if (queueError) throw queueError;

        setSettings(settingsData);
        setQueue(queueData || []);
        setAvgConsultTime(settingsData.avg_consultation_time);
      } else {
        const storedQueue = localStorage.getItem('qc_queue');
        const storedSettings = localStorage.getItem('qc_settings');

        if (storedQueue && storedSettings) {
          setQueue(JSON.parse(storedQueue));
          const parsedSettings = JSON.parse(storedSettings);
          setSettings(parsedSettings);
          setAvgConsultTime(parsedSettings.avg_consultation_time);
        } else {
          setQueue(MOCK_INITIAL_QUEUE);
          setSettings(MOCK_INITIAL_SETTINGS);
          setAvgConsultTime(MOCK_INITIAL_SETTINGS.avg_consultation_time);
          localStorage.setItem('qc_queue', JSON.stringify(MOCK_INITIAL_QUEUE));
          localStorage.setItem('qc_settings', JSON.stringify(MOCK_INITIAL_SETTINGS));
        }
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err.message || 'Failed to connect to Supabase database.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Setup Realtime subscription
  useEffect(() => {
    fetchData();

    if (!isSupabaseConfigured) return;

    const queueChannel = supabase
      .channel('realtime-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          supabase
            .from('queue')
            .select('*')
            .order('token_number', { ascending: true })
            .then(({ data, error }) => {
              if (!error && data) setQueue(data);
            });
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel('realtime-settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new) {
            setSettings(payload.new);
            setAvgConsultTime(payload.new.avg_consultation_time);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  // 3. Action: Generate New Token (Add Patient)
  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    if (!selectedDoctor) {
      showToast('Please select a doctor to assign before registering.', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      const name = newPatientName.trim();
      const phone = newPatientPhone.trim() || 'N/A';
      const assignedDoctorName = selectedDoctor.name;
      
      if (isSupabaseConfigured) {
        const { error: insertError } = await supabase
          .from('queue')
          .insert([{ patient_name: name, status: 'waiting', doctor_name: assignedDoctorName, phone_number: phone }]);
        
        if (insertError) throw insertError;
        showToast(`Token generated for ${name} (assigned to ${assignedDoctorName})!`, 'success');
      } else {
        const nextTokenNum = queue.length > 0 
          ? Math.max(...queue.map(p => p.token_number)) + 1 
          : 1;
        
        const newPatient = {
          id: crypto.randomUUID(),
          patient_name: name,
          phone_number: phone,
          token_number: nextTokenNum,
          doctor_name: assignedDoctorName,
          status: 'waiting',
          created_at: new Date().toISOString()
        };

        const updatedQueue = [...queue, newPatient];
        setQueue(updatedQueue);
        localStorage.setItem('qc_queue', JSON.stringify(updatedQueue));
        showToast(`Token QC-101-${nextTokenNum} generated for ${name} (assigned to ${assignedDoctorName})!`, 'success');
      }
      setNewPatientName('');
      setNewPatientPhone('');
      setSelectedDoctor(null);
      setDoctorSearchQuery('');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to add patient', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Action: Call Next Patient — skips tokens for removed patients, finds next available
  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const activePatient = queue.find(p => p.status === 'in-consultation');
      const waitingPatients = queue
        .filter(p => p.status === 'waiting')
        .sort((a, b) => a.token_number - b.token_number);

      // Find the next waiting patient whose token is greater than current, skip removed tokens
      const nextPatient = waitingPatients.find(
        p => p.token_number > settings.current_serving_token
      ) || waitingPatients[0];

      if (!nextPatient) {
        showToast('No more patients waiting in the queue.', 'error');
        setActionLoading(false);
        return;
      }

      const nextToken = nextPatient.token_number;

      if (isSupabaseConfigured) {
        if (activePatient) {
          await supabase
            .from('queue')
            .update({ status: 'completed' })
            .eq('id', activePatient.id);
        }

        await supabase
          .from('queue')
          .update({ status: 'in-consultation' })
          .eq('id', nextPatient.id);

        const { error: settingsError } = await supabase
          .from('settings')
          .update({ current_serving_token: nextToken })
          .eq('id', 1);

        if (settingsError) throw settingsError;

        showToast(`Calling Token QC-101-${nextToken}: ${nextPatient.patient_name}`, 'success');
      } else {
        const updatedQueue = queue.map(p => {
          if (p.status === 'in-consultation') return { ...p, status: 'completed' };
          if (p.id === nextPatient.id) return { ...p, status: 'in-consultation' };
          return p;
        });

        const updatedSettings = { ...settings, current_serving_token: nextToken };

        setQueue(updatedQueue);
        setSettings(updatedSettings);
        localStorage.setItem('qc_queue', JSON.stringify(updatedQueue));
        localStorage.setItem('qc_settings', JSON.stringify(updatedSettings));

        showToast(`Calling Token QC-101-${nextToken}: ${nextPatient.patient_name}`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to call next patient', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Start Doctor Consulting Session
  const handleStartSession = (e) => {
    e.preventDefault();
    if (!loggedInDoctor) return;
    const sessionName = sessionNameInput.trim() || `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    const newSession = {
      id: crypto.randomUUID(),
      doctorName: loggedInDoctor.name,
      doctorDept: loggedInDoctor.department || 'N/A',
      doctorChamber: loggedInDoctor.chamber || '101',
      doctorPhone: loggedInDoctor.phone || 'N/A',
      sessionName,
      startTime: new Date().toISOString(),
      endTime: null,
      attendedPatients: [],
      unattendedPatients: []
    };
    setActiveSessions(prev => ({
      ...prev,
      [loggedInDoctor.phone]: newSession
    }));
    setSessionNameInput('');
    showToast(`Session "${sessionName}" started!`, 'success');
  };

  // Action: Doctor-specific Call Next Patient
  const handleDocCallNext = async (doctorName) => {
    // Verify session is active
    const currentSession = activeSessions[loggedInDoctor?.phone];
    if (!currentSession) {
      showToast('Please start a session before consulting patients.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const activePatient = queue.find(p => p.status === 'in-consultation' && p.doctor_name === doctorName);
      const waitingPatients = queue
        .filter(p => p.status === 'waiting' && p.doctor_name === doctorName)
        .sort((a, b) => a.token_number - b.token_number);

      const nextPatient = waitingPatients[0];

      if (!nextPatient) {
        showToast('No more waiting patients assigned to you.', 'error');
        setActionLoading(false);
        return;
      }

      const nextToken = nextPatient.token_number;

      if (isSupabaseConfigured) {
        if (activePatient) {
          await supabase
            .from('queue')
            .update({ status: 'completed' })
            .eq('id', activePatient.id);
        }

        await supabase
          .from('queue')
          .update({ status: 'in-consultation' })
          .eq('id', nextPatient.id);

        const { error: settingsError } = await supabase
          .from('settings')
          .update({ current_serving_token: nextToken })
          .eq('id', 1);

        if (settingsError) throw settingsError;
      } else {
        const updatedQueue = queue.map(p => {
          if (p.status === 'in-consultation' && p.doctor_name === doctorName) return { ...p, status: 'completed' };
          if (p.id === nextPatient.id) return { ...p, status: 'in-consultation' };
          return p;
        });

        const updatedSettings = { ...settings, current_serving_token: nextToken };

        setQueue(updatedQueue);
        setSettings(updatedSettings);
        localStorage.setItem('qc_queue', JSON.stringify(updatedQueue));
        localStorage.setItem('qc_settings', JSON.stringify(updatedSettings));
      }

      // Log previous patient to session history
      if (activePatient) {
        const newAttended = {
          id: activePatient.id,
          patient_name: activePatient.patient_name,
          token_number: activePatient.token_number,
          phone_number: activePatient.phone_number || 'N/A',
          prescription_no: currentPrescriptionNo.trim() || 'N/A',
          attendedAt: new Date().toISOString()
        };
        setActiveSessions(prev => {
          const s = prev[loggedInDoctor.phone];
          if (!s) return prev;
          return {
            ...prev,
            [loggedInDoctor.phone]: {
              ...s,
              attendedPatients: [...s.attendedPatients, newAttended]
            }
          };
        });
        setCurrentPrescriptionNo('');
      }

      showToast(`Calling patient: ${nextPatient.patient_name}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error calling patient', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Doctor end patient consultation
  const handleDocEndSession = async (doctorName) => {
    setActionLoading(true);
    try {
      const activePatient = queue.find(p => p.status === 'in-consultation' && p.doctor_name === doctorName);
      if (!activePatient) {
        showToast('No active consultation to end.', 'error');
        setActionLoading(false);
        return;
      }

      if (isSupabaseConfigured) {
        await supabase
          .from('queue')
          .update({ status: 'completed' })
          .eq('id', activePatient.id);
      } else {
        const updatedQueue = queue.map(p => p.id === activePatient.id ? { ...p, status: 'completed' } : p);
        setQueue(updatedQueue);
        localStorage.setItem('qc_queue', JSON.stringify(updatedQueue));
      }

      // Log to session history
      const currentSession = activeSessions[loggedInDoctor?.phone];
      if (currentSession) {
        const newAttended = {
          id: activePatient.id,
          patient_name: activePatient.patient_name,
          token_number: activePatient.token_number,
          phone_number: activePatient.phone_number || 'N/A',
          prescription_no: currentPrescriptionNo.trim() || 'N/A',
          attendedAt: new Date().toISOString()
        };
        setActiveSessions(prev => {
          const s = prev[loggedInDoctor.phone];
          if (!s) return prev;
          return {
            ...prev,
            [loggedInDoctor.phone]: {
              ...s,
              attendedPatients: [...s.attendedPatients, newAttended]
            }
          };
        });
      }
      setCurrentPrescriptionNo('');

      showToast('Consultation completed.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error ending consultation.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Close session and compile report
  const handleDocCloseSession = async (doctorName) => {
    if (!window.confirm('Are you sure you want to end this session and generate a report?')) return;

    setActionLoading(true);
    try {
      const currentSession = activeSessions[loggedInDoctor?.phone];
      if (!currentSession) {
        showToast('No active session to close.', 'error');
        setActionLoading(false);
        return;
      }

      const activePatient = queue.find(p => p.status === 'in-consultation' && p.doctor_name === doctorName);
      let updatedSession = { ...currentSession };

      if (activePatient) {
        // Complete patient
        if (isSupabaseConfigured) {
          await supabase
            .from('queue')
            .update({ status: 'completed' })
            .eq('id', activePatient.id);
        } else {
          const updatedQueue = queue.map(p => p.id === activePatient.id ? { ...p, status: 'completed' } : p);
          setQueue(updatedQueue);
          localStorage.setItem('qc_queue', JSON.stringify(updatedQueue));
        }

        const newAttended = {
          id: activePatient.id,
          patient_name: activePatient.patient_name,
          token_number: activePatient.token_number,
          phone_number: activePatient.phone_number || 'N/A',
          prescription_no: currentPrescriptionNo.trim() || 'N/A',
          attendedAt: new Date().toISOString()
        };
        updatedSession.attendedPatients = [...updatedSession.attendedPatients, newAttended];
        setCurrentPrescriptionNo('');
      }

      // Collect unattended patients assigned to this doctor
      const unattendedPatients = queue
        .filter(p => p.status === 'waiting' && p.doctor_name === doctorName)
        .map(p => ({
          id: p.id,
          patient_name: p.patient_name,
          token_number: p.token_number,
          phone_number: p.phone_number || 'N/A'
        }));

      updatedSession.endTime = new Date().toISOString();
      updatedSession.unattendedPatients = unattendedPatients;

      // Add to history
      setSessionHistory(prev => [updatedSession, ...prev]);

      // Remove from active sessions
      setActiveSessions(prev => {
        const copy = { ...prev };
        delete copy[loggedInDoctor.phone];
        return copy;
      });

      showToast(`Session "${updatedSession.sessionName}" closed and report saved!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error closing session.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Notify Patient via SMS (Simulated)
  const handleSendSMS = (patient) => {
    const phone = patient.phone_number || '';
    if (!phone || phone === 'N/A') {
      showToast('No phone number registered for this patient.', 'error');
      return;
    }
    const message = `Dear ${patient.patient_name}, your token QC-101-${patient.token_number} is about to be called. Please make your way to the consultation area.`;
    alert(`[SIMULATED SMS to ${phone}]:\n"${message}"`);
    showToast(`Notification sent to ${patient.patient_name}!`, 'success');
  };

  // Doctor login/registration handler
  const handleDoctorSubmit = (e) => {
    e.preventDefault();
    if (!docPhone.trim() || !docName.trim()) {
      showToast('Please fill all login/register details.', 'error');
      return;
    }

    const existingDoc = doctorsList.find(d => d.phone === docPhone.trim() || d.name.toLowerCase() === docName.trim().toLowerCase());

    if (existingDoc) {
      setLoggedInDoctor(existingDoc);
      setIsDoctorLoggedIn(true);
      showToast(`Welcome back, ${existingDoc.name}!`, 'success');
    } else {
      const newDoc = {
        id: doctorsList.length + 1,
        name: docName.trim(),
        phone: docPhone.trim(),
        department: docDept,
        chamber: docChamber,
        accepting: true
      };
      const updatedDocs = [...doctorsList, newDoc];
      setDoctorsList(updatedDocs);
      setLoggedInDoctor(newDoc);
      setIsDoctorLoggedIn(true);
      showToast(`Doctor account created successfully for ${newDoc.name}!`, 'success');
    }
  };

  const handleToggleAccepting = (acceptingVal) => {
    if (!loggedInDoctor) return;
    const updatedDocs = doctorsList.map(d => d.name === loggedInDoctor.name ? { ...d, accepting: acceptingVal } : d);
    setDoctorsList(updatedDocs);
    setLoggedInDoctor({ ...loggedInDoctor, accepting: acceptingVal });
    showToast(`Status updated: Now ${acceptingVal ? 'Accepting' : 'Not Accepting'} patients.`, 'success');
  };

  // 5. Action: Update Average Consultation Time
  const handleUpdateAvgTime = async (val) => {
    const minutes = parseInt(val, 10) || 1;
    setAvgConsultTime(minutes);

    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('settings')
          .update({ avg_consultation_time: minutes })
          .eq('id', 1);
      } else {
        const updatedSettings = {
          ...settings,
          avg_consultation_time: minutes
        };
        setSettings(updatedSettings);
        localStorage.setItem('qc_settings', JSON.stringify(updatedSettings));
      }
    } catch (err) {
      console.error('Failed to update consultation time:', err);
    }
  };

  // 6. Action: Reset State
  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset the queue state?')) return;
    
    setActionLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error: delError } = await supabase.from('queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delError) throw delError;

        const { error: setErr } = await supabase
          .from('settings')
          .update({ current_serving_token: 1, avg_consultation_time: 15 })
          .eq('id', 1);
        if (setErr) throw setErr;

        showToast('Database reset successfully!', 'success');
        fetchData();
      } else {
        localStorage.removeItem('qc_queue');
        localStorage.removeItem('qc_settings');
        setQueue(MOCK_INITIAL_QUEUE);
        setSettings(MOCK_INITIAL_SETTINGS);
        setAvgConsultTime(MOCK_INITIAL_SETTINGS.avg_consultation_time);
        localStorage.setItem('qc_queue', JSON.stringify(MOCK_INITIAL_QUEUE));
        localStorage.setItem('qc_settings', JSON.stringify(MOCK_INITIAL_SETTINGS));
        showToast('Demo data reset successfully!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to reset queue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Remove Patient
  const handleRemovePatient = async (id, patientName) => {
    if (!window.confirm(`Are you sure you want to remove ${patientName} from the queue?`)) return;

    setActionLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error: delError } = await supabase
          .from('queue')
          .delete()
          .eq('id', id);

        if (delError) throw delError;
        showToast(`${patientName} removed from queue.`, 'success');
      } else {
        const updatedQueue = queue.filter(p => p.id !== id);
        setQueue(updatedQueue);
        localStorage.setItem('qc_queue', JSON.stringify(updatedQueue));
        showToast(`${patientName} removed from queue.`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to remove patient', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Update Patient details
  const handleUpdatePatient = async (id, updatedName, updatedTokenStr) => {
    const tokenNum = parseInt(updatedTokenStr, 10);
    if (isNaN(tokenNum) || tokenNum <= 0) {
      showToast('Token number must be a positive integer.', 'error');
      return;
    }

    // Check duplicate token number (excluding the current patient being edited)
    const duplicate = queue.find(p => p.id !== id && p.token_number === tokenNum);
    if (duplicate) {
      showToast(`Token number ${tokenNum} is already assigned to ${duplicate.patient_name}.`, 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error: updateError } = await supabase
          .from('queue')
          .update({ patient_name: updatedName.trim(), token_number: tokenNum })
          .eq('id', id);

        if (updateError) throw updateError;
        showToast('Patient details updated successfully.', 'success');
      } else {
        const updatedQueue = queue.map(p =>
          p.id === id ? { ...p, patient_name: updatedName.trim(), token_number: tokenNum } : p
        );
        setQueue(updatedQueue);
        localStorage.setItem('qc_queue', JSON.stringify(updatedQueue));
        showToast('Patient details updated successfully.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update patient details', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const servingPatient = queue.find(p => p.token_number === settings.current_serving_token);
  const upcomingQueue = queue
    .filter(p => p.status === 'waiting' && p.token_number > settings.current_serving_token)
    .sort((a, b) => a.token_number - b.token_number);

  const filteredUpcomingQueue = upcomingQueue
    .filter(p => p.patient_name.toLowerCase().includes(patientSearchQuery.toLowerCase()))
    .slice(0, 3);

  const waitingCount = queue.filter(p => p.status === 'waiting').length;
  const completedCount = queue.filter(p => p.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-800">
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium shadow-sm transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <div className="flex items-center gap-3">
          {/* Logo SVG matching the reference */}
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 100 100" className="w-9 h-9">
              <defs>
                <linearGradient id="qOutlineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0B2F61" />
                  <stop offset="40%" stopColor="#0D4B8A" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="qPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="60%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              {/* Stylized 'Q' shape */}
              <path 
                d="M 32,22 
                   C 42,16 58,16 68,22 
                   C 80,30 84,45 80,58 
                   C 76,70 64,80 50,80 
                   C 44,80 38,78 34,75 
                   L 26,82 
                   L 24,70 
                   C 18,62 16,50 20,38 
                   C 22,30 26,25 32,22 Z" 
                fill="none" 
                stroke="url(#qOutlineGrad)" 
                strokeWidth="7" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <path 
                d="M 50,80 L 68,80 C 74,80 80,74 80,68" 
                fill="none" 
                stroke="url(#qOutlineGrad)" 
                strokeWidth="7" 
                strokeLinecap="round" 
              />
              {/* ECG / heartbeat line ending in arrow */}
              <path 
                d="M 18,50 
                   L 38,50 
                   L 44,38 
                   L 52,65 
                   L 60,32 
                   L 68,54 
                   L 73,50 
                   L 84,50" 
                fill="none" 
                stroke="url(#qPulseGrad)" 
                strokeWidth="4.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {/* Arrow Head */}
              <path 
                d="M 78,44 L 86,50 L 78,56" 
                fill="none" 
                stroke="url(#qPulseGrad)" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {/* Plus (+) icon in the top right */}
              <path 
                d="M 76,20 L 86,20 M 81,15 L 81,25" 
                fill="none" 
                stroke="#0ea5e9" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center text-lg font-extrabold tracking-tight">
              <span className="text-[#0B2F61]">Queue</span>
              <span className="text-sky-500 ml-1">Cure</span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">Clinic Queue Director</p>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <div className="w-8 h-8 border-2 border-slate-350 border-t-slate-800 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-medium">Loading details...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md mx-auto text-center flex flex-col items-center gap-4 mt-12">
            <ShieldAlert className="w-12 h-12 text-rose-500" />
            <h3 className="text-base font-bold text-slate-900">Database Connection Required</h3>
            <p className="text-slate-500 text-xs leading-relaxed">{error}</p>
            <button 
              onClick={() => { isSupabaseConfigured ? fetchData() : setError(null); }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs transition"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMN 1: RECEPTIONIST VIEW */}
            <section className="minimal-panel rounded-xl p-6 flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-700" />
                    Receptionist Counter
                  </h2>
                  <p className="text-[11px] text-slate-400">Add patients and advance queue serving tokens.</p>
                </div>
                <span className="text-[9px] font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  Reception
                </span>
              </div>

              {/* Assign Doctor Card */}
              <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex flex-col gap-3.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-600" />
                  Assign Doctor
                </h3>
                
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={doctorSearchQuery}
                    onChange={(e) => setDoctorSearchQuery(e.target.value)}
                    placeholder="Search doctor by name or department..."
                    className="w-full pl-8 pr-3 py-2 rounded border border-slate-300 focus:outline-none focus:border-slate-400 text-xs text-slate-800 placeholder-slate-400"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Doctor Listings — only portal-registered doctors */}
                <div>
                  {(() => {
                    const registeredDocs = doctorsList.filter(doc => doc.phone);
                    const searchedDocs = doctorSearchQuery.trim() !== ''
                      ? registeredDocs.filter(doc =>
                          doc.name.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
                          (doc.department || '').toLowerCase().includes(doctorSearchQuery.toLowerCase())
                        )
                      : registeredDocs;

                    if (registeredDocs.length === 0) {
                      return (
                        <div className="text-center py-4 text-[11px] text-slate-400 italic border border-dashed border-slate-200 rounded-md">
                          No registered doctors yet.<br />Register via the Dr. Portal below.
                        </div>
                      );
                    }

                    if (searchedDocs.length === 0) {
                      return <span className="text-xs text-slate-400 italic">No doctors found</span>;
                    }

                    return (
                      <div className="flex flex-col gap-1.5">
                        {searchedDocs.map(doc => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setSelectedDoctor(selectedDoctor?.id === doc.id ? null : doc)}
                            className={`flex items-center justify-between gap-3 p-2 rounded border text-left text-xs transition ${
                              selectedDoctor?.id === doc.id
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {/* Left: name + department */}
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{doc.name}</div>
                              <div className={`text-[10px] ${selectedDoctor?.id === doc.id ? 'text-slate-300' : 'text-slate-500'}`}>
                                {doc.department}{doc.chamber ? ` • Room ${doc.chamber}` : ''}
                              </div>
                            </div>
                            {/* Right: status badge */}
                            <div className="shrink-0">
                              {doc.accepting === false ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 whitespace-nowrap">Not Accepting</span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">Accepting</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="relative bg-white border border-slate-200/80 rounded-lg p-5 flex flex-col gap-3.5 overflow-hidden">
                {/* Deactivated Overlay / Blur */}
                {!selectedDoctor && (
                  <div className="absolute inset-0 bg-slate-50/75 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-sm font-bold text-slate-800 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                      Select a Doctor First
                    </span>
                  </div>
                )}

                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-slate-600" />
                  New Registration
                </h3>
                <form onSubmit={handleAddPatient} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      required
                      disabled={!selectedDoctor}
                      value={newPatientName}
                      onChange={(e) => setNewPatientName(e.target.value)}
                      placeholder="Patient Name"
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:border-slate-400 text-xs text-slate-800 placeholder-slate-400 disabled:bg-slate-55 disabled:text-slate-400"
                    />
                    <input
                      type="tel"
                      disabled={!selectedDoctor}
                      value={newPatientPhone}
                      onChange={(e) => setNewPatientPhone(e.target.value)}
                      placeholder="Mobile Phone Number (e.g. 9876543210)"
                      className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:border-slate-400 text-xs text-slate-800 placeholder-slate-400 disabled:bg-slate-55 disabled:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading || !selectedDoctor}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-xs rounded transition flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      Generate Token
                    </button>
                  </div>
                  {selectedDoctor && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 flex items-center justify-between">
                      <span>Assigned to: <strong className="text-slate-800">{selectedDoctor.name}</strong> ({selectedDoctor.department})</span>
                      <button type="button" onClick={() => setSelectedDoctor(null)} className="text-slate-400 hover:text-slate-650 font-bold text-xs" title="Clear assignment">×</button>
                    </div>
                  )}
                </form>

                {/* Consultation Time — inside registration card */}
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Consultation Time
                    </span>
                    <div className="flex items-center border border-slate-300 rounded overflow-hidden">
                      <div className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50/50 min-w-[70px] text-center">
                        {avgConsultTime} min
                      </div>
                      <div className="flex flex-col border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateAvgTime(avgConsultTime + 1)}
                          className="px-2 py-0.5 hover:bg-slate-50 border-b border-slate-150 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                          title="Increase time"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateAvgTime(Math.max(1, avgConsultTime - 1))}
                          className="px-2 py-0.5 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                          title="Decrease time"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Centered Last Called Token inside the same New Registration box */}
                  <div className="flex flex-col items-center justify-center py-2 bg-slate-50 border border-slate-200/60 rounded-md">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Called Token</span>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                      {settings.current_serving_token > 0 ? `QC-101-${settings.current_serving_token}` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* EMBEDDED DOCTOR DASHBOARD — DIRECTLY UNDER NEW REGISTRATION */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-4 shadow-sm">
                {!isDoctorLoggedIn ? (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-3">
                      <Users className="w-4 h-4 text-slate-600" />
                      Dr. Login / Register
                    </h3>
                    <form onSubmit={handleDoctorSubmit} className="flex flex-col gap-2">

                      {/* Full Name with live suggestion dropdown */}
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Full Name (e.g. Dr. Arthur Dent)"
                          value={docName}
                          autoComplete="off"
                          onChange={(e) => {
                            const val = e.target.value;
                            setDocName(val);
                            setDetectedDoctor(null);
                            if (val.trim().length >= 2) {
                              const matches = doctorsList.filter(d =>
                                d.phone &&
                                d.name.toLowerCase().includes(val.toLowerCase())
                              );
                              setDocSuggestions(matches);
                            } else {
                              setDocSuggestions([]);
                            }
                          }}
                          onBlur={() => setTimeout(() => setDocSuggestions([]), 150)}
                          className={`w-full px-3 py-2 rounded border text-xs text-slate-800 focus:outline-none transition ${
                            detectedDoctor ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 focus:border-slate-400'
                          }`}
                        />
                        {docSuggestions.length > 0 && (
                          <div className="absolute z-30 left-0 right-0 top-full mt-0.5 bg-white border border-slate-200 rounded-md shadow-md overflow-hidden">
                            {docSuggestions.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onMouseDown={() => {
                                  setDocName(s.name);
                                  setDocPhone(s.phone || '');
                                  setDocDept(s.department || '');
                                  setDocChamber(s.chamber || '');
                                  setDetectedDoctor(s);
                                  setDocSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100 last:border-0"
                              >
                                <div>
                                  <div className="text-xs font-semibold text-slate-800">{s.name}</div>
                                  <div className="text-[10px] text-slate-500">{s.department}{s.chamber ? ` • Room ${s.chamber}` : ''}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Phone with live suggestion */}
                      <div className="relative">
                        <input
                          type="tel"
                          required
                          placeholder="Phone Number (e.g. 9876543210)"
                          value={docPhone}
                          autoComplete="off"
                          onChange={(e) => {
                            const val = e.target.value;
                            setDocPhone(val);
                            setDetectedDoctor(null);
                            if (val.trim().length >= 4) {
                              const matches = doctorsList.filter(d =>
                                d.phone &&
                                d.phone.includes(val)
                              );
                              setDocSuggestions(matches);
                            } else {
                              setDocSuggestions([]);
                            }
                          }}
                          onBlur={() => setTimeout(() => setDocSuggestions([]), 150)}
                          className={`w-full px-3 py-2 rounded border text-xs text-slate-800 focus:outline-none transition ${
                            detectedDoctor ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 focus:border-slate-400'
                          }`}
                        />
                        {docSuggestions.length > 0 && (
                          <div className="absolute z-30 left-0 right-0 top-full mt-0.5 bg-white border border-slate-200 rounded-md shadow-md overflow-hidden">
                            {docSuggestions.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onMouseDown={() => {
                                  setDocName(s.name);
                                  setDocPhone(s.phone || '');
                                  setDocDept(s.department || '');
                                  setDocChamber(s.chamber || '');
                                  setDetectedDoctor(s);
                                  setDocSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100 last:border-0"
                              >
                                <div>
                                  <div className="text-xs font-semibold text-slate-800">{s.name}</div>
                                  <div className="text-[10px] text-slate-500">{s.phone} • {s.department}{s.chamber ? ` • Room ${s.chamber}` : ''}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Department & Room — hidden when logging in as existing doctor */}
                      {!detectedDoctor && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              list="dept-options"
                              required
                              placeholder="Department"
                              value={docDept}
                              onChange={(e) => setDocDept(e.target.value)}
                              className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:border-slate-400 text-xs text-slate-800 bg-white"
                            />
                            <datalist id="dept-options">
                              <option value="Cardiology" />
                              <option value="Pediatrics" />
                              <option value="Neurology" />
                              <option value="Orthopedics" />
                              <option value="Dermatology" />
                              <option value="Psychiatry" />
                              <option value="General Medicine" />
                              <option value="Oncology" />
                              <option value="ENT" />
                              <option value="Gynecology" />
                              <option value="Radiology" />
                              <option value="Ophthalmology" />
                            </datalist>
                          </div>
                          <div className="relative">
                            <input
                              list="room-options"
                              required
                              placeholder="Room No."
                              value={docChamber}
                              onChange={(e) => setDocChamber(e.target.value)}
                              className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:border-slate-400 text-xs text-slate-800 bg-white"
                            />
                            <datalist id="room-options">
                              {Array.from({ length: 50 }, (_, i) => (
                                <option key={101 + i} value={String(101 + i)} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                      )}

                      {/* Detected doctor badge */}
                      {detectedDoctor && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-[11px] text-emerald-800 font-medium">
                            Recognised: {detectedDoctor.name} — {detectedDoctor.department}{detectedDoctor.chamber ? `, Room ${detectedDoctor.chamber}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDetectedDoctor(null);
                              setDocName(''); setDocPhone(''); setDocDept(''); setDocChamber('');
                            }}
                            className="ml-auto text-emerald-500 hover:text-emerald-700 text-xs font-bold"
                          >×</button>
                        </div>
                      )}

                      <button
                        type="submit"
                        className={`w-full py-2 text-white font-semibold text-xs rounded transition ${
                          detectedDoctor
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        {detectedDoctor ? 'Login' : 'Register'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900">{loggedInDoctor.name}</h4>
                          {loggedInDoctor.accepting ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" title="Accepting patients"></span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0" title="Not accepting patients"></span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-450">{loggedInDoctor.department} • Room {loggedInDoctor.chamber}</p>
                      </div>
                      <button
                        onClick={() => {
                          setIsDoctorLoggedIn(false);
                          setLoggedInDoctor(null);
                          setDocName('');
                          setDocPhone('');
                          setDocDept('');
                          setDocChamber('');
                          setDetectedDoctor(null);
                          setDocSuggestions([]);
                        }}
                        className="text-[10px] text-slate-400 hover:text-slate-650 border border-slate-200 rounded px-2 py-0.5 transition"
                      >
                        Logout
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {/* Check if doctor has an active session */}
                      {!activeSessions[loggedInDoctor.phone] ? (
                        <div className="flex flex-col gap-3 py-1 border-t border-slate-100 mt-1 pt-3 animate-fadeIn">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consultation Session</span>
                          <form onSubmit={handleStartSession} className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={sessionNameInput}
                              onChange={(e) => setSessionNameInput(e.target.value)}
                              placeholder="Session name (e.g. Morning OPD)"
                              className="w-full px-3 py-2 rounded border border-slate-350 focus:outline-none focus:border-slate-400 text-xs text-slate-800 bg-white placeholder-slate-400"
                            />
                            <button
                              type="submit"
                              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Start Session
                            </button>
                          </form>
                        </div>
                      ) : (
                        (() => {
                          const currentSession = activeSessions[loggedInDoctor.phone];
                          const hasActivePatient = queue.some(p => p.status === 'in-consultation' && p.doctor_name === loggedInDoctor.name);
                          return (
                            <div className="flex flex-col gap-3.5 animate-fadeIn">
                              {/* Session Banner */}
                              <div className="bg-emerald-50 border border-emerald-100 rounded p-2.5 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  <span className="text-[11px] font-bold text-emerald-800 truncate" title={currentSession.sessionName}>
                                    Active: {currentSession.sessionName}
                                  </span>
                                </div>
                                <span className="text-[9px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-250 shrink-0 shadow-sm">
                                  {currentSession.attendedPatients.length} Attended
                                </span>
                              </div>

                              {/* Active Patient Details */}
                              <div className="bg-slate-50 border border-slate-200 rounded p-3.5 flex flex-col gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Active Patient</span>
                                {hasActivePatient ? (
                                  (() => {
                                    const activePatient = queue.find(p => p.status === 'in-consultation' && p.doctor_name === loggedInDoctor.name);
                                    return (
                                      <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="text-xs font-extrabold text-slate-800">
                                              {activePatient.patient_name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                              Token: QC-101-{activePatient.token_number}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-1 border-t border-slate-200/80 pt-2.5">
                                          <label className="text-[9.5px] font-bold text-slate-450 uppercase tracking-wide">Prescription No.</label>
                                          <input
                                            type="text"
                                            value={currentPrescriptionNo}
                                            onChange={(e) => setCurrentPrescriptionNo(e.target.value)}
                                            placeholder="Enter prescription no. or details..."
                                            className="w-full px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:border-slate-400 text-xs text-slate-800 bg-white placeholder-slate-400"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-xs text-slate-400 italic">No active patient in consultation.</span>
                                )}
                              </div>

                              {/* Controls */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDocCallNext(loggedInDoctor.name)}
                                  disabled={actionLoading || !loggedInDoctor.accepting}
                                  className="py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs rounded transition flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Call Next Patient
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDocEndSession(loggedInDoctor.name)}
                                  disabled={actionLoading || !hasActivePatient}
                                  className="py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs rounded transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  End Consult
                                </button>
                              </div>

                              {/* Close Session and Report button */}
                              <button
                                type="button"
                                onClick={() => handleDocCloseSession(loggedInDoctor.name)}
                                disabled={actionLoading}
                                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-250 font-semibold text-xs rounded transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <X className="w-3.5 h-3.5 text-slate-500" />
                                End Session & Save Report
                              </button>
                            </div>
                          );
                        })()
                      )}

                      {/* Availability controls */}
                      <div className="flex gap-2 mt-1 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => handleToggleAccepting(true)}
                          className={`flex-1 py-1.5 rounded border text-[11px] font-semibold transition cursor-pointer ${
                            loggedInDoctor.accepting
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAccepting(false)}
                          className={`flex-1 py-1.5 rounded border text-[11px] font-semibold transition cursor-pointer ${
                            !loggedInDoctor.accepting
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Stop Accept
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SESSION HISTORY CARD — PUBLICLY ACCESSIBLE TO PATIENTS AT ANY TIME */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm mt-4 animate-fadeIn">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <div className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <FileText className="w-3 h-3 text-indigo-600" />
                  </div>
                  Session History (Stored Reports)
                </h3>
                
                {sessionHistory.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 italic">
                    No stored session reports yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {sessionHistory.map((session) => {
                      const dateObj = new Date(session.startTime);
                      const dateFormatted = dateObj.toLocaleDateString();
                      const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div 
                          key={session.id}
                          className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/85 rounded-lg p-3.5 flex justify-between items-center transition gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                        >
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">
                              {session.sessionName}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">
                              Doctor: <span className="font-extrabold text-slate-550">{session.doctorName}</span> • {dateFormatted}, {timeFormatted}
                            </p>
                          </div>
                          <button
                            onClick={() => downloadSessionReport(session)}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded text-[10.5px] font-bold transition shadow-sm cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-indigo-600" />
                            Download DOC
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* COLUMN 2: PATIENT WAITING ROOM VIEW */}
            <section className="minimal-panel rounded-xl p-6 flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-700" />
                    Waiting Room Display
                  </h2>
                </div>
                <div>
                  <input
                    list="waiting-room-options"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Type or pick room..."
                    className="text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 rounded px-2.5 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <datalist id="waiting-room-options">
                    {Array.from({ length: 50 }, (_, i) => (
                      <option key={101 + i} value={`Room ${101 + i}`} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Big Board Now Serving */}
              <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1">
                  {roomNumber} - Now Serving
                </span>
                <div className="text-6xl font-extrabold text-slate-950 my-1">
                  {settings.current_serving_token > 0 ? `QC-101-${settings.current_serving_token}` : '—'}
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-700">
                  {servingPatient ? servingPatient.patient_name : 'No active consultations'}
                </div>
                {servingPatient && servingPatient.doctor_name && (
                  <div className="mt-3.5 text-[10px] text-slate-500 font-medium bg-slate-50 border border-slate-150 rounded-full px-3 py-1 animate-fadeIn">
                    Consulting Doctor: <strong className="text-slate-700 font-semibold">{servingPatient.doctor_name}</strong>
                  </div>
                )}
              </div>

              {/* Simple Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-lg text-center flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-400">Patients Waiting</span>
                  <span className="text-lg font-bold text-slate-800">{waitingCount}</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-lg text-center flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-slate-400">Patients Served</span>
                  <span className="text-lg font-bold text-slate-800">{completedCount}</span>
                </div>
              </div>

              {/* Upcoming Queue - horizontal row format */}
              <div className="flex-1 flex flex-col gap-2.5">
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Queue (Next 3)</span>
                    <span className="text-[9px] text-slate-400">Refreshes in real-time</span>
                  </div>
                  
                  {/* Search Patients Bar */}
                  <div className="relative mt-1">
                    <input
                      type="text"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      placeholder="Search patient by name..."
                      className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-slate-350 text-xs text-slate-800 placeholder-slate-400"
                    />
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {filteredUpcomingQueue.length === 0 ? (
                  <div className="text-center py-8 bg-white border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 italic">
                    {patientSearchQuery.trim() ? 'No matching patients found.' : 'All caught up. No patients waiting.'}
                  </div>
                ) : (
                  <div className="flex flex-row gap-2 overflow-x-auto pb-1">
                    {filteredUpcomingQueue.map((patient) => {
                      const waitTime = (patient.token_number - settings.current_serving_token) * settings.avg_consultation_time;
                      return (
                        <div
                          key={patient.id}
                          className="flex-1 min-w-[170px] bg-white border border-slate-200 p-3 rounded-lg flex flex-col gap-1.5"
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                              QC-101-{patient.token_number}
                            </span>
                            <button
                              onClick={() => handleSendSMS(patient)}
                              className="text-[9px] bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold px-1.5 py-0.5 rounded border border-sky-150 transition"
                              title="Notify patient via SMS"
                            >
                              SMS
                            </button>
                          </div>
                          <h4 className="font-bold text-slate-800 text-xs truncate">{patient.patient_name}</h4>
                          <span className="text-[9px] text-slate-500 italic truncate">Dr: {patient.doctor_name}</span>
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 mt-auto pt-1">
                            <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{waitTime > 0 ? waitTime : settings.avg_consultation_time} min wait</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Queue Control — moved here under Upcoming Queue */}
              <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex flex-col gap-4">
                <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-slate-500" />
                  Queue Control
                </h3>

                <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs">
                  <span className="text-slate-500">Currently Serving Token:</span>
                  <span className="font-bold text-slate-800">
                    {settings.current_serving_token > 0 ? `QC-101-${settings.current_serving_token}` : '—'}
                  </span>
                </div>

                {/* Next 3 Patients List */}
                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next 3 Patients</span>
                  {upcomingQueue.slice(0, 3).length === 0 ? (
                    <div className="text-center py-2.5 text-xs text-slate-400 italic bg-slate-50/50 border border-dashed border-slate-200 rounded-md">
                      No patients waiting in queue.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {upcomingQueue.slice(0, 3).map((patient) => (
                        <div 
                          key={patient.id} 
                          className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 transition"
                        >
                          {editingPatientId === patient.id ? (
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleUpdatePatient(patient.id, editPatientName, editPatientToken);
                                setEditingPatientId(null);
                              }}
                              className="w-full flex flex-col gap-2 py-0.5"
                            >
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Patient Name</label>
                                <input
                                  type="text"
                                  required
                                  value={editPatientName}
                                  onChange={(e) => setEditPatientName(e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-slate-400 bg-white"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Token Number</label>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-450 font-semibold shrink-0">QC-101-</span>
                                  <input
                                    type="number"
                                    required
                                    value={editPatientToken}
                                    onChange={(e) => setEditPatientToken(e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-slate-400 bg-white"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-1.5 mt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingPatientId(null)}
                                  className="px-2 py-1 hover:bg-slate-200 text-[10px] font-semibold text-slate-600 rounded transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-semibold rounded transition"
                                >
                                  Save
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex justify-between items-center w-full">
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-slate-800 truncate">{patient.patient_name}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">QC-101-{patient.token_number}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 relative group">
                                <button
                                  type="button"
                                  className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-650 rounded transition cursor-pointer"
                                  title="More Options"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePatient(patient.id, patient.patient_name)}
                                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition shrink-0 cursor-pointer"
                                  title="Cancel Patient"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>

                                <div className="absolute right-0 top-6 hidden group-hover:block bg-white border border-slate-200 rounded shadow-md z-30 py-1 min-w-[70px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPatientId(patient.id);
                                      setEditPatientName(patient.patient_name);
                                      setEditPatientToken(String(patient.token_number));
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Call Next Patient
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={actionLoading}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-semibold text-xs rounded transition flex items-center justify-center"
                    title="Reset Queue"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </section>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-slate-400 text-[11px]">
        <p>Queue Cure Clinic Board • Clean Minimal Edition</p>
      </footer>
    </div>
  );
}
