import React, { useState, useEffect } from 'react';
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';

    const ProjectModal = ({ isOpen, onOpenChange, onSave, project }) => {
      const [name, setName] = useState('');
      const [description, setDescription] = useState('');

      useEffect(() => {
        if (project) {
          setName(project.name);
          setDescription(project.description);
        } else {
          setName('');
          setDescription('');
        }
      }, [project, isOpen]);

      const handleSave = () => {
        onSave({ id: project?.id, name, description });
        onOpenChange(false);
      };

      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="bg-slate-900 border-indigo-500/30 text-white">
            <DialogHeader>
              <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-indigo-300">Project Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-800 border-indigo-500/30"
                  placeholder="e.g., Q4 Marketing Campaign"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-indigo-300">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-800 border-indigo-500/30"
                  placeholder="Briefly describe the project"
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
              {project ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogContent>
        </Dialog>
      );
    };

    export default ProjectModal;