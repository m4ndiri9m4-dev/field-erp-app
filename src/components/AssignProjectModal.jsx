import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

// --- No longer needs to fetch projects, they will be passed in as a prop ---
// We already fetch projects in HR.jsx, so let's reuse that.

const AssignProjectModal = ({ isOpen, onOpenChange, employee, onAssign, projects = [] }) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    // When the modal opens, set the selected project
    if (employee?.projectId) {
      setSelectedProjectId(employee.projectId);
    } else if (projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [employee, projects, isOpen]);

  const handleAssign = () => {
    onAssign(employee.id, selectedProjectId);
    onOpenChange(false);
    toast({ title: "Project Assigned! 🚀", description: `${employee.firstName} has been assigned to a new project.` });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-indigo-500/30 text-white">
        <DialogHeader>
          <DialogTitle>Assign Project to {employee?.firstName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project" className="text-indigo-300">Select Project</Label>
            <select
              id="project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-800 border border-indigo-500/30 rounded-md p-2 text-white"
              disabled={!projects.length}
            >
              {projects.length > 0 ? (
                projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              ) : (
                <option>No projects available</option>
              )}
            </select>
          </div>
        </div>
        <Button onClick={handleAssign} disabled={!projects.length} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600">
          Assign Project
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AssignProjectModal;
