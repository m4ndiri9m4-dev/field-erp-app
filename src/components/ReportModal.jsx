import React, { useState, useEffect } from 'react';
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';

    const ReportModal = ({ isOpen, onOpenChange, onSave, report }) => {
      const [title, setTitle] = useState('');
      const [content, setContent] = useState('');

      useEffect(() => {
        if (report) {
          setTitle(report.title);
          setContent(report.content);
        } else {
          setTitle('');
          setContent('');
        }
      }, [report, isOpen]);

      const handleSave = () => {
        onSave({ id: report?.id, title, content });
        onOpenChange(false);
      };

      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="bg-slate-900 border-indigo-500/30 text-white">
            <DialogHeader>
              <DialogTitle>{report ? 'Edit Report' : 'Create New Report'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-indigo-300">Report Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-slate-800 border-indigo-500/30"
                  placeholder="e.g., Weekly Progress Summary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content" className="text-indigo-300">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="bg-slate-800 border-indigo-500/30 min-h-[150px]"
                  placeholder="Describe the details of your report here..."
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
              {report ? 'Save Changes' : 'Submit Report'}
            </Button>
          </DialogContent>
        </Dialog>
      );
    };

    export default ReportModal;