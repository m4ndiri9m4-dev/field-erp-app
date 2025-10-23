import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, DollarSign, Briefcase, Edit, Trash2, Loader2 } from 'lucide-react'; // Added Loader2
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import EmployeeModal from '@/components/EmployeeModal';
import AssignProjectModal from '@/components/AssignProjectModal';

// --- Firestore Imports ---
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query
} from 'firebase/firestore';


// --- Helper Function to Remove Undefined Fields ---
const cleanDataForFirestore = (data, isNew = false) => {
  const cleanedData = {};
  for (const key in data) {
    if (data[key] !== undefined) {
      cleanedData[key] = data[key];
    }
  }
  if (isNew) {
      delete cleanedData.id;
  }
  // Ensure numeric fields are numbers or null (or handle differently if 0 is invalid)
  if (cleanedData.dailyRate !== undefined) {
      cleanedData.dailyRate = Number(cleanedData.dailyRate) || 0; // Default to 0 if NaN
  }
  // Convert empty strings for optional fields to null or handle as needed
   if (cleanedData.middleName === '') cleanedData.middleName = null;
   if (cleanedData.email === '') cleanedData.email = null;
   if (cleanedData.department === '') cleanedData.department = null;
   if (cleanedData.contactNumber === '') cleanedData.contactNumber = null;
   if (cleanedData.profilePhoto === '') cleanedData.profilePhoto = null;
   if (cleanedData.projectId === '') cleanedData.projectId = null;


  return cleanedData;
};


const HR = ({ user, onLogout, db, appId, projects: projectListFromProps }) => { // Receive appId and projects
  const [employees, setEmployees] = useState([]);
  // Use projects from props if available, otherwise fetch
  const [projects, setProjects] = useState(projectListFromProps || []);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [assigningEmployee, setAssigningEmployee] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(!projectListFromProps); // Only load if not passed in

  // --- Firestore Logic ---
  const employeesCollectionPath = `artifacts/${appId}/public/data/employees`;
  const projectsCollectionPath = `artifacts/${appId}/public/data/projects`;

  // 1. Listen for Employees
  useEffect(() => {
    if (!db || !appId) return;

    setLoadingEmployees(true);
    const q = query(collection(db, employeesCollectionPath));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
      });
      setEmployees(data);
      setLoadingEmployees(false);
    }, (error) => {
      console.error("Error listening to employees:", error);
      setLoadingEmployees(false);
      toast({ title: "Error loading employees", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [db, appId, employeesCollectionPath]); // Added collection path

  // 2. Listen for Projects (if not passed as props)
  useEffect(() => {
    // Only run if projects weren't passed via props
    if (projectListFromProps || !db || !appId) return;

    setLoadingProjects(true);
    const q = query(collection(db, projectsCollectionPath));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
      });
      setProjects(data);
      setLoadingProjects(false);
    }, (error) => {
        console.error("Error listening to projects:", error);
        setLoadingProjects(false);
        toast({ title: "Error loading projects for assignment", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [db, appId, projectListFromProps, projectsCollectionPath]); // Added dependencies


  // 3. Save/Update Employee
  const handleSaveEmployee = async (employeeData) => {
    if (!db || !appId) return;

    const isNew = !employeeData.id;
    const cleanedData = cleanDataForFirestore(employeeData, isNew);

     // Basic Validation (consider a library like Zod for complex validation)
     if (!cleanedData.firstName || !cleanedData.lastName || !cleanedData.designation) {
       toast({
         title: "Required Fields Missing",
         description: "First Name, Last Name, and Designation are required.",
         variant: "destructive",
       });
       return;
     }

    try {
      if (!isNew) {
        const docRef = doc(db, employeesCollectionPath, employeeData.id);
        await updateDoc(docRef, cleanedData); // Use cleaned data
        toast({ title: "Employee Updated! 👤" });
      } else {
        // Add createdAt timestamp for new employees
        cleanedData.createdAt = new Date().toISOString();
        await addDoc(collection(db, employeesCollectionPath), cleanedData); // Use cleaned data
        toast({ title: "Employee Added! ✨" });
      }
      setIsEmployeeModalOpen(false);
      setEditingEmployee(null); // Clear editing state
    } catch (error) {
      console.error("Error saving employee:", error);
      toast({ title: "Error Saving Employee", description: error.message, variant: "destructive" });
    }
  };

  // 4. Delete Employee
  const handleDeleteEmployee = async (employeeId) => {
    if (!db || !appId || !employeeId) return;
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    try {
      await deleteDoc(doc(db, employeesCollectionPath, employeeId));
      toast({ title: "Employee Deleted. 🗑️", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting employee:", error);
       toast({ title: "Error Deleting Employee", description: error.message, variant: "destructive" });
    }
  };

  // 5. Assign Project
  const handleAssignProject = async (employeeId, projectId) => {
     if (!db || !appId || !employeeId) return;
     // Clean the data - ensure projectId is not undefined, maybe null if unassigning
     const dataToUpdate = cleanDataForFirestore({ projectId: projectId || null });

    try {
      const docRef = doc(db, employeesCollectionPath, employeeId);
      await updateDoc(docRef, dataToUpdate); // Use cleaned data
      toast({ title: "Project Assigned!" });
      setIsAssignModalOpen(false);
      setAssigningEmployee(null); // Clear assigning state
    } catch (error) {
      console.error("Error assigning project:", error);
      toast({ title: "Error Assigning Project", description: error.message, variant: "destructive" });
    }
  };

  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Not Assigned';
  };

  // Combine loading states
  const isLoading = loadingEmployees || loadingProjects;


  return (
    <Layout user={user} onLogout={onLogout} title="HR & Payroll">
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onOpenChange={(open) => {
            setIsEmployeeModalOpen(open);
            if (!open) setEditingEmployee(null); // Clear editing state on close
        }}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
      />
      <AssignProjectModal
        isOpen={isAssignModalOpen}
        onOpenChange={(open) => {
            setIsAssignModalOpen(open);
            if (!open) setAssigningEmployee(null); // Clear assigning state on close
        }}
        employee={assigningEmployee}
        projects={projects} // Pass fetched or prop projects
        onAssign={handleAssignProject}
      />

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold neon-text">Employees</h2>
          <Button
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            onClick={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>

        {isLoading && (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                <p className="ml-4">Loading HR Data...</p>
            </div>
        )}

         {!isLoading && employees.length === 0 && (
             <div className="text-center py-10 glass-panel rounded-xl neon-border">
                 <Users className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                 <p className="text-lg text-gray-400">No employees found.</p>
                 <p className="text-sm text-gray-500">Click "Add Employee" to get started.</p>
             </div>
         )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!isLoading && employees.map((employee) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel rounded-xl p-4 neon-border flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                    {/* Basic placeholder - consider adding image upload later */}
                     <Users className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="ghost" size="icon" className="text-yellow-400 hover:bg-yellow-500/10 h-8 w-8" onClick={() => { setEditingEmployee(employee); setIsEmployeeModalOpen(true); }}>
                        <Edit className="w-4 h-4"/>
                     </Button>
                     <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10 h-8 w-8" onClick={() => handleDeleteEmployee(employee.id)}>
                         <Trash2 className="w-4 h-4"/>
                     </Button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white truncate">{employee.firstName} {employee.lastName}</h3>
                <p className="text-indigo-400 font-semibold">{employee.designation}</p>
                <div className="space-y-1 text-sm mt-3">
                  <p className="text-gray-400 truncate"><span className="font-semibold text-gray-500">Dept:</span> {employee.department || 'N/A'}</p>
                  <p className="text-gray-400 truncate"><span className="font-semibold text-gray-500">Email:</span> {employee.email || 'N/A'}</p>
                  <p className="text-gray-400 truncate"><span className="font-semibold text-gray-500">Contact:</span> {employee.contactNumber || 'N/A'}</p>
                   <p className="text-gray-400 flex items-center gap-1"><DollarSign className="w-4 h-4 text-green-500" /> <span className="font-semibold text-green-400">₱{employee.dailyRate || 0} / day</span></p>
                  <p className="text-gray-400 flex items-center gap-1"><Briefcase className="w-4 h-4 text-purple-400" /> {getProjectName(employee.projectId)}</p>
                </div>
              </div>
               <Button
                variant="outline" // Changed variant
                className="w-full mt-4 border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/30 hover:text-indigo-200"
                onClick={() => { setAssigningEmployee(employee); setIsAssignModalOpen(true); }}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Assign to Project
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default HR;

