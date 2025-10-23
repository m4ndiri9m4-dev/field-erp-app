import React, { useState, useEffect } from 'react';
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { toast } from '@/components/ui/use-toast';

    const EmployeeModal = ({ isOpen, onOpenChange, onSave, employee }) => {
      const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        designation: '',
        department: '',
        contactNumber: '',
        profilePhoto: '',
        dailyRate: 0,
      });

      useEffect(() => {
        if (employee) {
          setFormData({
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            middleName: employee.middleName || '',
            email: employee.email || '',
            designation: employee.designation || '',
            department: employee.department || '',
            contactNumber: employee.contactNumber || '',
            profilePhoto: employee.profilePhoto || '',
            dailyRate: employee.dailyRate || 0,
          });
        } else {
          setFormData({
            firstName: '', lastName: '', middleName: '', email: '',
            designation: '', department: '', contactNumber: '',
            profilePhoto: '', dailyRate: 0,
          });
        }
      }, [employee, isOpen]);

      const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
      };
      
      const handleFileChange = () => {
        toast({ title: "🚧 Feature not implemented", description: "Profile photo upload is not available yet." });
      };

      const handleSave = () => {
        if (!formData.firstName || !formData.lastName || !formData.designation) {
          toast({
            title: "Required Fields Missing",
            description: "First Name, Last Name, and Designation are required.",
            variant: "destructive",
          });
          return;
        }
        onSave({ id: employee?.id, ...formData });
      };

      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="bg-slate-900 border-indigo-500/30 text-white max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-indigo-300">First Name</Label>
                  <Input id="firstName" value={formData.firstName} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-indigo-300">Last Name</Label>
                  <Input id="lastName" value={formData.lastName} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName" className="text-indigo-300">Middle Name</Label>
                <Input id="middleName" value={formData.middleName} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-indigo-300">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="designation" className="text-indigo-300">Designation</Label>
                  <Input id="designation" value={formData.designation} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" />
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
                  <Input id="dailyRate" type="number" value={formData.dailyRate} onChange={handleInputChange} className="bg-slate-800 border-indigo-500/30" />
                </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="profilePhoto" className="text-indigo-300">Profile Photo</Label>
                <Input id="profilePhoto" type="file" onChange={handleFileChange} className="bg-slate-800 border-indigo-500/30" />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
              {employee ? 'Save Changes' : 'Create Employee'}
            </Button>
          </DialogContent>
        </Dialog>
      );
    };

    export default EmployeeModal;