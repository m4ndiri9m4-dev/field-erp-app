import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Using shadcn Select
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { getIdToken } from 'firebase/auth'; // To get token for Cloud Function call

// Define available roles based on who is creating
const getAvailableRoles = (currentUserRole) => {
    if (currentUserRole === 'Admin') {
        return ['Manager', 'Office Staff', 'Field Employee'];
    }
    if (currentUserRole === 'Manager') {
        return ['Field Employee'];
    }
    return []; // No creation allowed for other roles
};

// --- !! IMPORTANT !! ---
// Replace with your actual Cloud Function URL after deployment
const CREATE_USER_FUNCTION_URL = 'YOUR_CLOUD_FUNCTION_URL_HERE/createUser';
// Example: 'https://us-central1-your-project-id.cloudfunctions.net/createUser'


const CreateUserModal = ({ isOpen, onOpenChange, currentUserRole, projects, auth }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

     // Employee Details (mirroring HR modal)
     const [firstName, setFirstName] = useState('');
     const [lastName, setLastName] = useState('');
     const [designation, setDesignation] = useState('');
     const [dailyRate, setDailyRate] = useState('');
     // Add other fields as needed (department, contactNumber etc.)


    const availableRoles = getAvailableRoles(currentUserRole);

    useEffect(() => {
        // Reset form when modal opens or role changes
        if (isOpen) {
            setEmail('');
            setPassword('');
            setConfirmPassword('');
             // Set default role based on availability
             setSelectedRole(availableRoles.length > 0 ? availableRoles[0] : '');
            setSelectedProjectId(projects.length > 0 ? projects[0].id : ''); // Default project
             // Reset employee details
             setFirstName('');
             setLastName('');
             setDesignation('');
             setDailyRate('');
            setIsSubmitting(false);
        }
    }, [isOpen, currentUserRole, projects, availableRoles]); // Added availableRoles

    const handleCreate = async () => {
        // Validation
        if (!email || !password || !selectedRole || !firstName || !lastName || !designation) {
            toast({ title: "Missing Fields", description: "Please fill in Email, Password, Role, First Name, Last Name, and Designation.", variant: "destructive" });
            return;
        }
        if (password.length < 6) {
             toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
             return;
        }
        if (password !== confirmPassword) {
            toast({ title: "Passwords Don't Match", variant: "destructive" });
            return;
        }
        if (selectedRole === 'Field Employee' && !selectedProjectId) {
            toast({ title: "Project Required", description: "Please select a project for the Field Employee.", variant: "destructive" });
            return;
        }

         // Validate daily rate
         const rate = parseFloat(dailyRate);
         if (isNaN(rate) || rate < 0) {
             toast({ title: "Invalid Daily Rate", description: "Please enter a valid non-negative number for daily rate.", variant: "destructive" });
             return;
         }


        setIsSubmitting(true);

        try {
             // Get the current user's ID token to authenticate the Cloud Function call
             if (!auth.currentUser) {
                 throw new Error("Not authenticated.");
             }
             const idToken = await getIdToken(auth.currentUser);

            // Call the Cloud Function
            const response = await fetch(CREATE_USER_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`, // Send token for auth check in function
                },
                body: JSON.stringify({
                    email,
                    password,
                    role: selectedRole,
                    projectId: selectedRole === 'Field Employee' ? selectedProjectId : null,
                     // Pass employee details
                     firstName,
                     lastName,
                     designation,
                     dailyRate: rate, // Pass parsed rate
                     // Add other details like department, contactNumber if you added them to the form
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                 // Throw error with message from the function if available
                 throw new Error(result.error || `Request failed with status ${response.status}`);
            }

            toast({ title: "User Created Successfully! 🎉", description: result.message });
            onOpenChange(false); // Close modal on success

        } catch (error) {
            console.error("Error calling createUser function:", error);
            toast({
                title: "Failed to Create User",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-indigo-500/30 text-white max-h-[90vh] overflow-y-auto scrollbar-hide">
                <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Enter the details for the new user account. An email and temporary password will be used for their first login.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-indigo-300">Email Address</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-800 border-indigo-500/30" placeholder="user@example.com" />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="role" className="text-indigo-300">Assign Role</Label>
                              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={availableRoles.length === 0}>
                                 <SelectTrigger className="w-full bg-slate-800 border-indigo-500/30">
                                     <SelectValue placeholder="Select a role" />
                                 </SelectTrigger>
                                 <SelectContent className="bg-slate-800 text-white border-indigo-500/50">
                                     {availableRoles.length === 0 && <SelectItem value="" disabled>No roles available</SelectItem>}
                                     {availableRoles.map(role => (
                                         <SelectItem key={role} value={role}>{role}</SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                        </div>
                    </div>

                     {/* Employee Details */}
                     <h4 className="text-md font-semibold text-indigo-300 pt-2 border-t border-slate-700/50">Employee Profile</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label htmlFor="firstName" className="text-indigo-300">First Name</Label>
                             <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-slate-800 border-indigo-500/30" />
                         </div>
                         <div className="space-y-2">
                             <Label htmlFor="lastName" className="text-indigo-300">Last Name</Label>
                             <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-slate-800 border-indigo-500/30" />
                         </div>
                     </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <Label htmlFor="designation" className="text-indigo-300">Designation</Label>
                             <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} className="bg-slate-800 border-indigo-500/30" />
                         </div>
                          <div className="space-y-2">
                             <Label htmlFor="dailyRate" className="text-indigo-300">Daily Rate (₱)</Label>
                             <Input id="dailyRate" type="number" min="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} className="bg-slate-800 border-indigo-500/30" />
                         </div>
                         {/* Add Department, Contact fields here if needed */}
                     </div>

                    {/* Project Assignment (Conditional) */}
                    {selectedRole === 'Field Employee' && (
                        <div className="space-y-2">
                            <Label htmlFor="project" className="text-indigo-300">Assign to Project</Label>
                             <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={projects.length === 0}>
                                 <SelectTrigger className="w-full bg-slate-800 border-indigo-500/30">
                                     <SelectValue placeholder="Select a project" />
                                 </SelectTrigger>
                                 <SelectContent className="bg-slate-800 text-white border-indigo-500/50">
                                      {projects.length === 0 && <SelectItem value="" disabled>No projects available</SelectItem>}
                                      {projects.map(p => (
                                         <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                        </div>
                    )}

                    {/* Password */}
                    <h4 className="text-md font-semibold text-indigo-300 pt-2 border-t border-slate-700/50">Set Initial Password</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-indigo-300">Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-800 border-indigo-500/30" placeholder="Min. 6 characters" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-indigo-300">Confirm Password</Label>
                            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-slate-800 border-indigo-500/30" placeholder="Re-enter password" />
                        </div>
                    </div>

                </div>
                <Button onClick={handleCreate} disabled={isSubmitting} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    {isSubmitting ? 'Creating User...' : 'Create User Account'}
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default CreateUserModal;
