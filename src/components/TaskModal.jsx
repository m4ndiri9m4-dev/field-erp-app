import React, { useState, useEffect } from 'react';
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';

    const TaskModal = ({ isOpen, onOpenChange, onSave, task, projects }) => {
      const [title, setTitle] = useState('');
      const [description, setDescription] = useState('');
      const [priority, setPriority] = useState('Medium');
      const [projectId, setProjectId] = useState('');

      useEffect(() => {
        if (task) {
          setTitle(task.title);
          setDescription(task.description || '');
          setPriority(task.priority);
          setProjectId(task.projectId);
        } else {
          setTitle('');
          setDescription('');
          setPriority('Medium');
          setProjectId(projects.length > 0 ? projects[0].id : '');
        }
      }, [task, isOpen, projects]);

      const handleSave = () => {
        onSave({ id: task?.id, title, description, priority, projectId });
        onOpenChange(false);
      };

      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="bg-slate-900 border-indigo-500/30 text-white">
            <DialogHeader>
              <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-indigo-300">Task Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-slate-800 border-indigo-500/30"
                  placeholder="e.g., Design new landing page"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-indigo-300">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-800 border-indigo-500/30"
                  placeholder="Add more details about the task"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-indigo-300">Priority</Label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-800 border border-indigo-500/30 rounded-md p-2"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project" className="text-indigo-300">Project</Label>
                <select
                  id="project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-slate-800 border border-indigo-500/30 rounded-md p-2"
                  disabled={!projects.length}
                >
                  {projects.length > 0 ? (
                    projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                  ) : (
                    <option>Create a project first</option>
                  )}
                </select>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600">
              {task ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogContent>
        </Dialog>
      );
    };

    export default TaskModal;