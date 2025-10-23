import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Edit, Trash2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import ReportModal from '@/components/ReportModal';

// --- Firestore Imports ---
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs // Use getDocs for on-demand fetching
} from 'firebase/firestore';

const Reports = ({ user, onLogout, db }) => {
  const [selectedReportType, setSelectedReportType] = useState('attendance');
  const [userReports, setUserReports] = useState([]);
  const [systemReportData, setSystemReportData] = useState([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [loadingUserReports, setLoadingUserReports] = useState(true);
  const [loadingSystemReport, setLoadingSystemReport] = useState(true);

  // --- Firestore Logic ---
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  
  // Path for user-submitted reports
  const userReportsCollectionPath = `artifacts/${appId}/public/data/user-reports`;
  
  // Paths for system data
  const reportPaths = {
    attendance: `artifacts/${appId}/public/data/attendance`,
    tasks: `artifacts/${appId}/public/data/tasks`,
    inventory: `artifacts/${appId}/public/data/inventory`,
  };
  
  const reportTypes = [
    { id: 'attendance', name: 'Attendance', icon: '⏰' },
    { id: 'tasks', name: 'Tasks', icon: '✅' },
    { id: 'inventory', name: 'Inventory', icon: '📦' },
  ];

  const filteredReportTypes = user.role === 'Field Employee'
    ? reportTypes.filter(rt => rt.id !== 'inventory')
    : reportTypes;

  // 1. Listen for USER-SUBMITTED reports
  useEffect(() => {
    if (!db || !user) return;
    
    setLoadingUserReports(true);
    const q = query(
      collection(db, userReportsCollectionPath),
      where("userId", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
      });
      setUserReports(data);
      setLoadingUserReports(false);
    }, (error) => {
      console.error("Error listening to user reports:", error);
      setLoadingUserReports(false);
    });

    return () => unsubscribe();
  }, [db, user, appId]);
  
  // 2. Fetch SYSTEM data when tab changes
  useEffect(() => {
    if (!db || !selectedReportType) return;

    const fetchData = async () => {
      setLoadingSystemReport(true);
      const path = reportPaths[selectedReportType];
      if (!path) {
        setSystemReportData([]);
        setLoadingSystemReport(false);
        return;
      }

      try {
        const q = query(collection(db, path));
        const querySnapshot = await getDocs(q);
        const data = [];
        querySnapshot.forEach((doc) => {
          data.push({ ...doc.data(), id: doc.id });
        });
        
        // --- Role-based filtering ---
        if (user.role === 'Field Employee') {
          if (selectedReportType === 'attendance') {
            setSystemReportData(data.filter(item => item.userId === user.uid));
          } else if (selectedReportType === 'tasks') {
            // This is complex, would need to fetch employee data first
            // For now, just show all tasks.
            // A better way: add 'assignedTo' (user.uid) to each task.
            setSystemReportData(data); // Simpler for now
          } else {
            setSystemReportData(data);
          }
        } else {
          // Admin/Manager sees all
          setSystemReportData(data);
        }
        
      } catch (error) {
        console.error("Error fetching system report:", error);
        toast({ title: "Error fetching report data", variant: "destructive" });
      }
      setLoadingSystemReport(false);
    };

    fetchData();
  }, [db, user, selectedReportType, appId]);


  // 3. Save/Update User Report
  const handleSaveReport = async (reportData) => {
    try {
      if (reportData.id) {
        const docRef = doc(db, userReportsCollectionPath, reportData.id);
        await updateDoc(docRef, reportData);
        toast({ title: "Report Updated! 📝" });
      } else {
        const newReport = { 
          ...reportData, 
          userId: user.uid, 
          userEmail: user.email,
          createdAt: new Date().toISOString() 
        };
        await addDoc(collection(db, userReportsCollectionPath), newReport);
        toast({ title: "Report Submitted! 👍" });
      }
      setIsReportModalOpen(false);
    } catch (error) {
      console.error("Error saving report:", error);
    }
  };

  // 4. Delete User Report
  const handleDeleteReport = async (reportId) => {
    if (window.confirm("Delete this report?")) {
      try {
        await deleteDoc(doc(db, userReportsCollectionPath, reportId));
        toast({ title: "Report Deleted. 🗑️", variant: "destructive" });
      } catch (error) {
        console.error("Error deleting report:", error);
      }
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Reports & Analytics">
      <ReportModal isOpen={isReportModalOpen} onOpenChange={setIsReportModalOpen} onSave={handleSaveReport} report={editingReport} />
      <div className="space-y-6">
        {user.role === 'Field Employee' && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-xl p-6 neon-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold neon-text">My Submitted Reports</h2>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600" onClick={() => { setEditingReport(null); setIsReportModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> New Report
              </Button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-hide">
              {loadingUserReports && <p className="text-gray-400 text-center py-4">Loading my reports...</p>}
              {!loadingUserReports && userReports.length > 0 ? userReports.map(report => (
                <div key={report.id} className="bg-slate-800/50 rounded p-3 border border-indigo-500/20 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{report.title}</p>
                    <p className="text-xs text-gray-400">Submitted on {new Date(report.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Edit className="w-4 h-4 text-yellow-400 cursor-pointer" onClick={() => { setEditingReport(report); setIsReportModalOpen(true); }} />
                    <Trash2 className="w-4 h-4 text-red-400 cursor-pointer" onClick={() => handleDeleteReport(report.id)} />
                  </div>
                </div>
              )) : !loadingUserReports && (
                <p className="text-gray-400 text-center py-4">You have not submitted any reports yet.</p>
              )}
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-xl p-6 neon-border">
          <h2 className="text-2xl font-bold neon-text mb-4">System Data</h2>
          <div className="grid grid-cols-3 gap-3">
            {filteredReportTypes.map((report) => (
              <Button
                key={report.id}
                onClick={() => setSelectedReportType(report.id)}
                className={`h-auto py-4 flex flex-col items-center gap-2 ${
                  selectedReportType === report.id
                    ? 'bg-gradient-to-r from-indigo-600 to-pink-600'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <span className="text-2xl">{report.icon}</span>
                <span className="text-xs text-center">{report.name}</span>
              </Button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-xl p-6 neon-border">
          <h3 className="text-xl font-bold text-white mb-4">
            {reportTypes.find(r => r.id === selectedReportType)?.name} Data
          </h3>
          <div className="bg-slate-900/50 rounded-lg p-4 max-h-96 overflow-y-auto scrollbar-hide">
            {loadingSystemReport && (
              <div className="text-center py-12">
                <p className="text-gray-400 animate-pulse">Loading data...</p>
              </div>
            )}
            {!loadingSystemReport && systemReportData.length > 0 ? (
              <div className="space-y-2">
                {systemReportData.map((item) => (
                  <div key={item.id} className="bg-slate-800/50 rounded p-3 border border-indigo-500/20">
                    <pre className="text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : !loadingSystemReport && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">No data available for this report</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Reports;
