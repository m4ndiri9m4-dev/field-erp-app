import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit, Trash2, Loader2, Filter } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import CreateUserModal from '@/components/CreateUserModal'; // New Modal
import { Input } from '@/components/ui/input'; // For filtering

// Firebase Imports
import { collection, onSnapshot, query, where, getFirestore } from 'firebase/firestore';
// Import functions if needed (e.g., for delete, though delete should be a Cloud Function too for security)

const UserManagement = ({ user, onLogout, db, appId, auth }) => { // Pass auth for token
  const [usersList, setUsersList] = useState([]);
  const [projects, setProjects] = useState([]); // Needed for assigning field workers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Firestore collection paths
  const employeesCollectionPath = `artifacts/${appId}/public/data/employees`;
  const projectsCollectionPath = `artifacts/${appId}/public/data/projects`;


  // 1. Listen for Employees (Users) from Firestore
  useEffect(() => {
    if (!db || !appId) return;

    setLoading(true);
    const q = query(collection(db, employeesCollectionPath)); // Fetch all employee records
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
       // Sort alphabetically by first name for consistent display
       data.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
      setUsersList(data);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to employees:", error);
      setLoading(false);
      toast({ title: "Error loading users", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [db, appId, employeesCollectionPath]);

  // 2. Fetch Projects (for assigning Field Workers)
  useEffect(() => {
    if (!db || !appId) return;

    // Fetch projects needed for the dropdown in the modal
    const q = query(collection(db, projectsCollectionPath));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setProjects(data);
    }, (error) => {
      console.error("Error fetching projects:", error);
      toast({ title: "Error loading projects for assignment", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [db, appId, projectsCollectionPath]);


   // Filter users based on input
   const filteredUsers = usersList.filter(u =>
     (u.firstName?.toLowerCase() || '').includes(filter.toLowerCase()) ||
     (u.lastName?.toLowerCase() || '').includes(filter.toLowerCase()) ||
     (u.email?.toLowerCase() || '').includes(filter.toLowerCase()) ||
     (u.role?.toLowerCase() || '').includes(filter.toLowerCase())
   );

   // Simplified getProjectName (can enhance later)
   const getProjectName = (projectId) => {
       return projects.find(p => p.id === projectId)?.name || 'N/A';
   }

  // --- Render ---

  // Basic Loading state
  if (loading && usersList.length === 0) {
    return (
        <Layout user={user} onLogout={onLogout} title="User Management">
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                <p className="ml-4">Loading Users...</p>
            </div>
        </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout} title="User Management">
       <CreateUserModal
         isOpen={isCreateModalOpen}
         onOpenChange={setIsCreateModalOpen}
         // onSave={handleCreateUser} // The logic is inside the modal now
         currentUserRole={user.role} // Pass current user's role for dropdown logic
         projects={projects} // Pass projects for assignment
         auth={auth} // Pass auth to get ID token
       />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold neon-text">Manage Users</h2>
           {/* Filter Input */}
           <div className="relative w-full sm:w-64">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    type="text"
                    placeholder="Filter by name, email, role..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-10 bg-slate-800 border-indigo-500/30 text-white"
                />
            </div>
           {/* Create User Button - only visible if authorized */}
           {(user.role === 'Admin' || user.role === 'Manager') && (
               <Button
                 className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 w-full sm:w-auto"
                 onClick={() => setIsCreateModalOpen(true)}
               >
                 <Plus className="w-4 h-4 mr-2" />
                 Create New User
               </Button>
            )}
        </div>

        {/* User List Table */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-xl p-4 neon-border"
        >
             {loading ? (
                  <div className="flex justify-center items-center h-40">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  </div>
              ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-10">
                      <Users className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                      <p className="text-lg text-gray-400">{filter ? 'No users match your filter.' : 'No users found.'}</p>
                       {(user.role === 'Admin' || user.role === 'Manager') && !filter && (
                           <p className="text-sm text-gray-500">Click "Create New User" to add the first one.</p>
                       )}
                  </div>
              ) : (
                  <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
                      <table className="w-full text-sm text-left text-gray-300">
                          <thead className="text-xs text-indigo-300 uppercase bg-slate-800/50 sticky top-0 backdrop-blur-sm">
                              <tr>
                                  <th scope="col" className="px-6 py-3">Name</th>
                                  <th scope="col" className="px-6 py-3">Email</th>
                                  <th scope="col" className="px-6 py-3">Role</th>
                                  <th scope="col" className="px-6 py-3">Designation</th>
                                  <th scope="col" className="px-6 py-3">Project</th>
                                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {filteredUsers.map((u) => (
                                  <tr key={u.id || u.email} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                      <td className="px-6 py-3 font-medium text-white whitespace-nowrap">
                                          {u.firstName || ''} {u.lastName || ''}
                                      </td>
                                      <td className="px-6 py-3">{u.email}</td>
                                      <td className="px-6 py-3">{u.role}</td>
                                      <td className="px-6 py-3">{u.designation}</td>
                                      <td className="px-6 py-3">{u.role === 'Field Employee' ? getProjectName(u.projectId) : 'N/A'}</td>
                                      <td className="px-6 py-3 text-right">
                                          {/* Placeholder for Edit/Delete Actions */}
                                          {/* IMPORTANT: Deleting users requires another Cloud Function for security */}
                                           {/* <Button variant="ghost" size="icon" className="text-yellow-400 hover:bg-yellow-500/10 h-7 w-7 mr-1">
                                                <Edit className="w-4 h-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10 h-7 w-7">
                                                 <Trash2 className="w-4 h-4"/>
                                            </Button> */}
                                            <span className="text-xs text-gray-500 italic">Actions TBD</span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default UserManagement;
