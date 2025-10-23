import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Briefcase, Trash2, Edit, CheckSquare, Clock, AlertCircle, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import ProjectModal from '@/components/ProjectModal';
import TaskModal from '@/components/TaskModal';

// Firebase Imports
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  doc,
  query,
  where,
  getDocs, // Import getDocs for deleting tasks
  getFirestore // Make sure getFirestore is imported if db is not passed directly
} from 'firebase/firestore';


// --- Helper Function to Remove Undefined Fields ---
// We'll use this before saving any data to Firestore
const cleanDataForFirestore = (data, isNew = false) => {
  const cleanedData = {};
  for (const key in data) {
    // Keep null and false values, but remove undefined
    if (data[key] !== undefined) {
      // Convert empty strings for potentially optional fields to null
      // Adjust this list based on your actual data model needs
      if (['description', 'middleName', 'email', 'department', 'contactNumber', 'profilePhoto', 'location'].includes(key) && data[key] === '') {
          cleanedData[key] = null;
      } else {
          cleanedData[key] = data[key];
      }
    }
  }
  // If creating a new document, ensure 'id' is definitely not present
  if (isNew) {
      delete cleanedData.id;
  }
  // Ensure numeric fields are numbers or null/0 if applicable
  if (cleanedData.quantity !== undefined) cleanedData.quantity = Number(cleanedData.quantity) || 0;
  if (cleanedData.reorderLevel !== undefined) cleanedData.reorderLevel = Number(cleanedData.reorderLevel) || 0;
  if (cleanedData.dailyRate !== undefined) cleanedData.dailyRate = Number(cleanedData.dailyRate) || 0;
  if (cleanedData.amount !== undefined) cleanedData.amount = Number(cleanedData.amount) || 0;

  // Ensure location object is valid or null
  if (cleanedData.location && (cleanedData.location.lat === undefined || cleanedData.location.lng === undefined)) {
      console.warn("Location data incomplete, setting to null");
      cleanedData.location = null;
  } else if (cleanedData.location === undefined) {
      cleanedData.location = null;
  }

  // Ensure projectId is not empty string, maybe null if unassigning
  if (cleanedData.projectId === '') {
      cleanedData.projectId = null;
  }


  return cleanedData;
};


const ProjectManagement = ({ user, onLogout, db, appId }) => { // Receive db and appId props
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Firestore collection paths
  const projectsCollectionPath = `artifacts/${appId}/public/data/projects`;
  const tasksCollectionPath = `artifacts/${appId}/public/data/tasks`;

  // --- Firestore Listeners ---
  useEffect(() => {
    if (!db || !appId) {
        setLoadingProjects(false); // Stop loading if no db/appId
        return;
    };

    setLoadingProjects(true);
    const projectsQuery = query(collection(db, projectsCollectionPath));
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(fetchedProjects);
       // Logic to select the first project if none is selected or the current one disappears
      if (fetchedProjects.length > 0 && (!selectedProject || !fetchedProjects.some(p => p.id === selectedProject.id))) {
           setSelectedProject(fetchedProjects[0]);
       } else if (fetchedProjects.length === 0) {
           setSelectedProject(null); // No projects left
       }
      setLoadingProjects(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      toast({ title: "Error loading projects", variant: "destructive", description: error.message });
      setLoadingProjects(false);
    });

    return () => unsubscribeProjects();
     // Rerun if db/appId changes, or if selectedProject becomes invalid (handled inside)
  }, [db, appId]);

  useEffect(() => {
      if (!db || !appId) {
          setLoadingTasks(false); // Stop loading if no db/appId
          return;
      };

      setLoadingTasks(true);
      const tasksQuery = query(collection(db, tasksCollectionPath)); // Listen to ALL tasks
      const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTasks(fetchedTasks);
          setLoadingTasks(false);
      }, (error) => {
          console.error("Error fetching tasks:", error);
          toast({ title: "Error loading tasks", variant: "destructive", description: error.message });
          setLoadingTasks(false);
      });

      return () => unsubscribeTasks();
  }, [db, appId]); // Only depends on db and appId


  // --- CRUD Operations ---

  const handleSaveProject = async (projectData) => {
    if (!db || !appId) return;

    const isNew = !projectData.id;
    const cleanedData = cleanDataForFirestore(projectData, isNew);

     // Basic Validation
     if (!cleanedData.name) {
       toast({ title: "Project Name is required", variant: "destructive" });
       return;
     }

    try {
      if (!isNew) {
        // Update existing project
        const projectRef = doc(db, projectsCollectionPath, projectData.id);
        await updateDoc(projectRef, cleanedData);
        toast({ title: "Project Updated! ✨" });
      } else {
        // Create new project
        cleanedData.createdAt = new Date().toISOString(); // Add timestamp for new
        cleanedData.createdBy = user?.email || 'Unknown User'; // Track creator
        const newDocRef = await addDoc(collection(db, projectsCollectionPath), cleanedData);
        toast({ title: "Project Created! 🚀" });
         // Automatically select the new project if none was selected before
         // The listener will update the list, this provides immediate feedback
         if (!selectedProject) {
             setSelectedProject({ id: newDocRef.id, ...cleanedData });
         }
      }
      setIsProjectModalOpen(false); // Close modal on success
      setEditingProject(null); // Clear editing state
    } catch (error) {
      console.error("Error saving project:", error);
      toast({ title: "Error Saving Project", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!db || !appId || !projectId) return;
    if (!window.confirm("Are you sure you want to delete this project and ALL its tasks? This cannot be undone.")) return;

    try {
      // Delete the project document
      await deleteDoc(doc(db, projectsCollectionPath, projectId));

      // Query and delete associated tasks
      const tasksToDeleteQuery = query(collection(db, tasksCollectionPath), where("projectId", "==", projectId));
      const taskSnapshot = await getDocs(tasksToDeleteQuery);
       const deletePromises = taskSnapshot.docs.map(taskDoc =>
           deleteDoc(doc(db, tasksCollectionPath, taskDoc.id))
       );
       await Promise.all(deletePromises); // Wait for all task deletions

      toast({ title: "Project and Tasks Deleted. 🗑️", variant: "destructive" });
      // The onSnapshot listener for projects will handle updating the UI and potentially selectedProject
    } catch (error) {
      console.error("Error deleting project and tasks:", error);
      toast({ title: "Error Deleting Project", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveTask = async (taskData) => {
    if (!db || !appId || !taskData.projectId) { // Ensure projectId is present
         toast({ title: "Project selection is required for task", variant: "destructive" });
        return;
    };

    const isNew = !taskData.id;
    const taskToSave = {
        ...taskData,
        // Only add metadata if it's a new task
        ...(isNew && {
            createdBy: user?.email || 'Unknown User',
            createdAt: new Date().toISOString(),
            status: 'To Do' // Default status for new tasks
        }),
        // Ensure status is present even on updates if somehow missing
        ...(!isNew && !taskData.status && { status: 'To Do' })
    };

    const cleanedData = cleanDataForFirestore(taskToSave, isNew);

     // Basic Validation
     if (!cleanedData.title) {
         toast({ title: "Task Title is required", variant: "destructive" });
         return;
     }
     if (!cleanedData.projectId) { // Double check after cleaning
         toast({ title: "Project ID missing after cleaning data", variant: "destructive" });
         return;
     }

    try {
      if (!isNew) {
        // Update existing task
        const taskRef = doc(db, tasksCollectionPath, taskData.id);
        // Ensure createdAt and createdBy are not overwritten on update
        delete cleanedData.createdAt;
        delete cleanedData.createdBy;
        await updateDoc(taskRef, cleanedData);
        toast({ title: "Task Updated! ✅" });
      } else {
        // Create new task
        await addDoc(collection(db, tasksCollectionPath), cleanedData);
        toast({ title: "Task Created! 💡" });
      }
       setIsTaskModalOpen(false); // Close modal on success
       setEditingTask(null); // Clear editing state
    } catch (error) {
      console.error("Error saving task:", error);
      toast({ title: "Error Saving Task", description: error.message, variant: "destructive" });
    }
  };


    const handleDeleteTask = async (taskId) => {
        if (!db || !appId || !taskId) return;
        // Optional: Add confirmation dialog
        // if (!window.confirm("Delete this task?")) return;
        try {
            await deleteDoc(doc(db, tasksCollectionPath, taskId));
            toast({ title: "Task Deleted. 🗑️", variant: "destructive" });
        } catch (error) {
            console.error("Error deleting task:", error);
            toast({ title: "Error Deleting Task", description: error.message, variant: "destructive" });
        }
    };

    const updateTaskStatus = async (taskId, status) => {
        if (!db || !appId || !taskId) return;
        try {
            const taskRef = doc(db, tasksCollectionPath, taskId);
            await updateDoc(taskRef, { status }); // Only update the status field
            toast({ title: "Status Updated! 🔄", description: `Task moved to ${status}` });
        } catch (error) {
            console.error("Error updating task status:", error);
            toast({ title: "Error Updating Status", description: error.message, variant: "destructive" });
        }
    };

    // --- Derived State & UI Helpers ---

    // Filter tasks based on the currently selected project *after* tasks state is updated
    const filteredTasks = selectedProject ? tasks.filter(task => task.projectId === selectedProject.id) : [];

    const getStatusIcon = (status) => ({
        'To Do': <Clock className="w-4 h-4 text-yellow-400" />,
        'In Progress': <AlertCircle className="w-4 h-4 text-blue-400" />,
        'Done': <CheckSquare className="w-4 h-4 text-green-400" />
    })[status] || <Clock className="w-4 h-4 text-gray-400"/>; // Default icon

    const getPriorityColor = (priority) => ({
        'High': 'border-red-500 bg-red-900/30 text-red-300', // Adjusted colors for better contrast
        'Medium': 'border-yellow-500 bg-yellow-900/30 text-yellow-300', // Adjusted colors
        'Low': 'border-green-500 bg-green-900/30 text-green-300' // Adjusted colors
    })[priority] || 'border-gray-600 bg-gray-800/30 text-gray-400'; // Default style

    // Combine loading states
    const isLoading = loadingProjects || loadingTasks;

    // --- Render ---

    // Show loading indicator until both projects and initial tasks are loaded
    if (isLoading && projects.length === 0 && tasks.length === 0) {
        return (
             <Layout user={user} onLogout={onLogout} title="Project Management">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                    <p className="ml-4 text-lg">Loading Projects & Tasks...</p>
                </div>
            </Layout>
        );
    }


    return (
        <Layout user={user} onLogout={onLogout} title="Project Management">
            {/* Modals */}
            <ProjectModal
                isOpen={isProjectModalOpen}
                 onOpenChange={(open) => {
                     setIsProjectModalOpen(open);
                     if (!open) setEditingProject(null); // Clear editing state on close
                 }}
                onSave={handleSaveProject}
                project={editingProject}
            />
            <TaskModal
                isOpen={isTaskModalOpen}
                 onOpenChange={(open) => {
                     setIsTaskModalOpen(open);
                     if (!open) setEditingTask(null); // Clear editing state on close
                 }}
                onSave={handleSaveTask}
                task={editingTask}
                projects={projects} // Pass projects for the dropdown
                selectedProjectId={selectedProject?.id} // Pass current project ID as default
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Projects Sidebar */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold neon-text">Projects</h2>
                        <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700" onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="glass-panel neon-border p-3 rounded-lg space-y-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
                        {loadingProjects && projects.length === 0 && (
                             <div className="flex justify-center items-center py-4">
                                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                             </div>
                        )}
                        {!loadingProjects && projects.length === 0 && (
                             <p className="text-center text-gray-400 py-4 text-sm">No projects yet. Add one!</p>
                        )}
                        {projects.map(p => (
                            <div key={p.id} onClick={() => setSelectedProject(p)} className={`p-3 rounded-md cursor-pointer transition-all duration-150 ease-in-out ${selectedProject?.id === p.id ? 'bg-indigo-600/50 ring-2 ring-pink-500 shadow-lg' : 'hover:bg-slate-700/60'}`}>
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-white truncate pr-2">{p.name}</span>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <Button variant="ghost" size="icon" className="text-yellow-400 hover:bg-yellow-500/10 h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingProject(p); setIsProjectModalOpen(true); }} aria-label="Edit Project">
                                            <Edit className="w-3 h-3"/>
                                        </Button>
                                         <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10 h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }} aria-label="Delete Project">
                                             <Trash2 className="w-3 h-3"/>
                                         </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 truncate">{p.description || 'No description'}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Task Board */}
                <div className="lg:col-span-9">
                    {selectedProject ? (
                        <>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                                <h2 className="text-2xl font-bold neon-text truncate">{selectedProject.name}</h2>
                                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 self-start sm:self-center" onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Task
                                </Button>
                            </div>
                            {loadingTasks && filteredTasks.length === 0 ? (
                                <div className="flex justify-center items-center h-64">
                                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                    <p className="ml-3">Loading tasks...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {['To Do', 'In Progress', 'Done'].map((status) => (
                                        <motion.div
                                            key={status}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="glass-panel rounded-xl p-4 neon-border min-h-[200px]" // Added min-h
                                        >
                                            <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-300">{getStatusIcon(status)} {status}</h3>
                                            <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide pr-1"> {/* Added padding-right for scrollbar space */}
                                                {filteredTasks.filter(t => t.status === status).length === 0 && (
                                                    <p className="text-center text-gray-500 text-sm py-4 italic">No tasks here.</p>
                                                )}
                                                {filteredTasks.filter(t => t.status === status).map(task => (
                                                    <div key={task.id} className={`p-3 rounded-lg border-l-4 transition-shadow hover:shadow-md ${getPriorityColor(task.priority)} bg-slate-900/40`}>
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-bold text-white break-words mr-2 text-sm">{task.title}</h4>
                                                            <div className="flex gap-1 flex-shrink-0">
                                                                 <Button variant="ghost" size="icon" className="text-yellow-400 hover:bg-yellow-500/10 h-6 w-6" onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} aria-label="Edit Task">
                                                                     <Edit className="w-3 h-3"/>
                                                                 </Button>
                                                                 <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10 h-6 w-6" onClick={() => handleDeleteTask(task.id)} aria-label="Delete Task">
                                                                     <Trash2 className="w-3 h-3"/>
                                                                 </Button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-300 mt-1 break-words">{task.description || 'No description'}</p>
                                                        <div className="flex justify-between items-center mt-2 text-xs">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                                            <select
                                                                value={task.status}
                                                                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                                                className="bg-slate-800/70 border border-slate-700 rounded text-[10px] p-0.5 text-white focus:ring-1 focus:ring-indigo-500"
                                                                onClick={(e) => e.stopPropagation()} // Prevent card click
                                                            >
                                                                <option>To Do</option>
                                                                <option>In Progress</option>
                                                                <option>Done</option>
                                                            </select>
                                                        </div>
                                                        {task.createdAt && (
                                                            <p className="text-[10px] text-gray-500 mt-2 text-right">
                                                                Added by {task.createdBy?.split('@')[0] || task.createdBy} on {new Date(task.createdAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                         // Only show this if projects have loaded but none exist or none selected
                         !loadingProjects && projects.length > 0 ? (
                             <div className="flex flex-col items-center justify-center h-[70vh] glass-panel neon-border rounded-lg p-8 text-center">
                                <Briefcase className="w-16 h-16 text-indigo-500/50 mb-4" />
                                <h2 className="text-xl font-bold text-white">Select a Project</h2>
                                <p className="text-gray-400 text-sm">Choose a project from the list on the left to view its tasks.</p>
                            </div>
                         ) : !loadingProjects && projects.length === 0 ? (
                             <div className="flex flex-col items-center justify-center h-[70vh] glass-panel neon-border rounded-lg p-8 text-center">
                                <Briefcase className="w-16 h-16 text-indigo-500/50 mb-4" />
                                <h2 className="text-xl font-bold text-white">No Projects Found</h2>
                                <p className="text-gray-400 text-sm">Create your first project using the '+' button in the sidebar.</p>
                            </div>
                         ) : null // Should be covered by the main loading indicator initially
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ProjectManagement;

