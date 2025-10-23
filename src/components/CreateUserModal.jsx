import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react'; // Import Loader

// Firebase Imports (Only needed for Auth Token)
import { getAuth, getIdToken } from 'firebase/auth';

// --- Netlify Function URL ---
// Replace this with the actual URL provided by Netlify after deployment
// It will look like: https://your-site-name.netlify.app/.netlify/functions/createUser
const CREATE_USER_FUNCTION_URL = '/.netlify/functions/createUser'; // Use relative path for same-site deployment


const CreateUserModal = ({ isOpen, onOpenChange, projects, currentUserRole }) => { // Pass currentUserRole
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: '', // Default role based on creator later
    firstName: '',
    lastName: '',
    designation: '',
    dailyRate: 0,
    department: '',
    contactNumber: '',
    projectId: '', // Only for Field Employee
  });
  const [isLoading, setIsLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);

  // Determine which roles the current user can create
  useEffect(() => {
    let roles = [];
    if (currentUserRole === 'Admin') {
      roles = ['Admin', 'Manager', 'Field Employee', 'Office Staff'];
    } else if (currentUserRole === 'Manager') {
      roles = ['Field Employee'];
    }
    setAvailableRoles(roles);
    // Set default role selection if possible
    setFormData(prev => ({ ...prev, role: roles.length > 0 ? roles[0] : '' }));
  }, [currentUserRole, isOpen]); // Rerun when modal opens or role changes


  // Reset form when modal closes or opens
  useEffect(() => {
      if (!isOpen) {
        // Reset form completely when closed
        setFormData({
            email: '', password: '', confirmPassword: '', role: '',
            firstName: '', lastName: '', designation: '', dailyRate: 0,
            department: '', contactNumber: '', projectId: '',
        });
        // Reset role based on available roles when opening
      } else if (availableRoles.length > 0) {
           setFormData(prev => ({ ...prev, role: availableRoles[0] }));
           // Set default project if field worker is default and projects exist
           if (availableRoles[0] === 'Field Employee' && projects && projects.length > 0) {
                setFormData(prev => ({ ...prev, projectId: projects[0].id }));
           } else {
               setFormData(prev => ({ ...prev, projectId: '' }));
           }
      }
  }, [isOpen, availableRoles, projects]); // Added projects dependency

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));

     // Reset projectId if role changes away from Field Employee
     if (id === 'role' && value !== 'Field Employee') {
       setFormData(prev => ({ ...prev, projectId: '' }));
     }
     // Set default project if role changes TO Field Employee and projects exist
     else if (id === 'role' && value === 'Field Employee' && projects && projects.length > 0) {
        setFormData(prev => ({ ...prev, projectId: projects[0].id }));
     }
  };

  const handleSave = async (e) => {
     e.preventDefault(); // Prevent default form submission
     setIsLoading(true);

     // --- Basic Validation ---
     if (!formData.email || !formData.password || !formData.role || !formData.firstName || !formData.lastName || !formData.designation) {
       toast({ title: "Missing Required Fields", description: "Email, password, role, first/last name, and designation are required.", variant: "destructive" });
       setIsLoading(false);
       return;
     }
     if (formData.password !== formData.confirmPassword) {
       toast({ title: "Passwords do not match", variant: "destructive" });
       setIsLoading(false);
       return;
     }
     if (formData.password.length < 6) {
        toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
        setIsLoading(false);
        return;
     }
     if (formData.role === 'Field Employee' && !formData.projectId) {
       toast({ title: "Project Required", description: "Please assign a project for Field Employees.", variant: "destructive" });
       setIsLoading(false);
       return;
     }

     // --- Get Auth Token ---
     const auth = getAuth();
     const currentUser = auth.currentUser;
     let idToken = null;
     if (currentUser) {
       try {
         idToken = await getIdToken(currentUser);
       } catch (tokenError) {
         console.error("Error getting ID token:", tokenError);
         toast({ title: "Authentication Error", description: "Could not verify your session. Please log out and back in.", variant: "destructive" });
         setIsLoading(false);
         return;
       }
     } else {
       toast({ title: "Not Authenticated", description: "You must be logged in to create users.", variant: "destructive" });
       setIsLoading(false);
       return;
     }


     // --- Prepare Data for Function ---
     const dataToSend = {
       email: formData.email,
       password: formData.password,
       role: formData.role,
       firstName: formData.firstName,
       lastName: formData.lastName,
       designation: formData.designation,
       dailyRate: Number(formData.dailyRate) || 0,
       department: formData.department || null,
       contactNumber: formData.contactNumber || null,
       projectId: formData.role === 'Field Employee' ? formData.projectId : null,
     };

     // --- Call Netlify Function ---
     try {
       const response = await fetch(CREATE_USER_FUNCTION_URL, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${idToken}`,
         },
         body: JSON.stringify(dataToSend),
       });

       const result = await response.json();

       if (!response.ok) {
         // Use error message from the function if available
         throw new Error(result.error || `Server responded with status ${response.status}`);
       }

       toast({ title: "User Created Successfully!", description: result.message });
       onOpenChange(false); // Close modal on success

     } catch (error) {
       console.error("Error calling createUser function:", error);
       toast({ title: "Error Creating User", description: error.message, variant: "destructive" });
     } finally {
       setIsLoading(false);
     }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-indigo-500/30 text-white max-h-[90vh] overflow-y-auto scrollbar-hide sm:max-w-[600px]"> {/* Wider modal */}
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave}> {/* Use form element */}
          <div className="space-y-4 py-4">
            {/* Email/Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-indigo-300">Email Address *</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" required />
              </div>
               <div className="space-y-2">
                 <Label htmlFor="role" className="text-indigo-300">Role *</Label>
                 <select id="role" value={formData.role} onChange={handleInputChange} className="w-full bg-slate-800 border border-indigo-500/30 rounded-md p-2 text-white h-10" required disabled={availableRoles.length === 0}>
                   {availableRoles.length > 0 ? (
                       availableRoles.map(role => <option key={role} value={role}>{role}</option>)
                   ) : (
                       <option>No roles available to create</option>
                   )}
                 </select>
               </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="password" className="text-indigo-300">Password *</Label>
                 <Input id="password" type="password" value={formData.password} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" required />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="confirmPassword" className="text-indigo-300">Confirm Password *</Label>
                 <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" required />
               </div>
             </div>

              {/* Employee Details */}
               <hr className="border-slate-700 my-4" />
               <h3 className="text-lg font-semibold text-indigo-300 mb-2">Employee Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-indigo-300">First Name *</Label>
                  <Input id="firstName" value={formData.firstName} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-indigo-300">Last Name *</Label>
                  <Input id="lastName" value={formData.lastName} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" required />
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="designation" className="text-indigo-300">Designation *</Label>
                     <Input id="designation" value={formData.designation} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" required />
                   </div>
                    <div className="space-y-2">
                     <Label htmlFor="department" className="text-indigo-300">Department</Label>
                     <Input id="department" value={formData.department} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" />
                   </div>
               </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="contactNumber" className="text-indigo-300">Contact Number</Label>
                   <Input id="contactNumber" value={formData.contactNumber} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" />
                 </div>
                 <div className="space-y-2">
                  <Label htmlFor="dailyRate" className="text-indigo-300">Daily Rate (₱)</Label>
                  <Input id="dailyRate" type="number" min="0" value={formData.dailyRate} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" />
                </div>
              </div>

              {/* Project Assignment (Conditional) */}
              {formData.role === 'Field Employee' && (
                <div className="space-y-2">
                  <Label htmlFor="projectId" className="text-indigo-300">Assign to Project *</Label>
                  <select id="projectId" value={formData.projectId} onChange={handleInputChange} className="w-full bg-slate-800 border border-indigo-500/30 rounded-md p-2 text-white h-10" required={formData.role === 'Field Employee'} disabled={!projects || projects.length === 0}>
                    {(projects && projects.length > 0) ? (
                      projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                    ) : (
                      <option value="">No projects available</option>
                    )}
                  </select>
                </div>
              )}
          </div>
          <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isLoading ? 'Creating User...' : 'Create User'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;

