import React, { useState, useMemo } from 'react'; // Added useMemo
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Home, Clock, Briefcase, Package, Users, DollarSign, FileText, UserCog } from 'lucide-react'; // Added UserCog
import { Button } from '@/components/ui/button';

const Layout = ({ children, user, onLogout, title }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Define base menu items with required roles
  const baseMenuItems = useMemo(() => [ // Use useMemo to prevent re-creation on every render
    { icon: Home, label: 'Dashboard', path: '/dashboard', roles: ['Admin', 'Manager', 'Field Employee'] }, // All roles
    { icon: Clock, label: 'Time & Attendance', path: '/time-attendance', roles: ['Admin', 'Manager', 'Field Employee'] }, // All roles
    { icon: Briefcase, label: 'Project Management', path: '/projects', roles: ['Admin', 'Manager'] }, // Admin, Manager
    { icon: Package, label: 'Inventory', path: '/inventory', roles: ['Admin', 'Manager'] }, // Admin, Manager
    { icon: Users, label: 'HR', path: '/hr', roles: ['Admin'] }, // Admin only
    { icon: DollarSign, label: 'Finance', path: '/finance', roles: ['Admin'] }, // Admin only
    { icon: UserCog, label: 'User Management', path: '/user-management', roles: ['Admin', 'Manager'] }, // Admin, Manager
    { icon: FileText, label: 'Reports', path: '/reports', roles: ['Admin', 'Manager', 'Field Employee'] }, // All roles
  ], []); // Empty dependency array means this runs once


  // Filter menu items based on the user's role (safely check user and role)
  const filteredMenuItems = useMemo(() => {
     // If user or user.role is not available yet, maybe show nothing or just dashboard?
     if (!user?.role) {
         // Option 1: Show nothing until role is loaded
         // return [];
         // Option 2: Show only dashboard if logged in but role unknown
          const dashboardItem = baseMenuItems.find(item => item.label === 'Dashboard');
          return dashboardItem ? [dashboardItem] : [];
     }
     // Filter based on the role defined in each item's 'roles' array
     return baseMenuItems.filter(item => item.roles.includes(user.role));
  }, [user?.role, baseMenuItems]); // Depend only on user.role and the base items


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"> {/* Added bg gradient */}
      <nav className="glass-panel border-b border-indigo-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white hover:bg-indigo-500/20 lg:hidden" // Hide on large screens
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
              <h1 className="text-xl font-bold neon-text">{title || 'Field ERP'}</h1> {/* Fallback title */}
            </div>
            <div className="flex items-center gap-4">
              {/* Display user email or name */}
              <span className="text-sm text-gray-400 hidden sm:block">{user?.displayName || user?.email || ''}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="text-red-400 hover:bg-red-500/20"
                aria-label="Logout" // Added aria-label
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

        {/* Sidebar for larger screens */}
        <div className="hidden lg:block fixed left-0 top-16 bottom-0 w-64 glass-panel border-r border-indigo-500/30 z-40 overflow-y-auto scrollbar-hide">
             <div className="p-4 space-y-2">
               {filteredMenuItems.map((item) => (
                 <Button
                   key={item.path}
                   onClick={() => navigate(item.path)}
                   variant={window.location.pathname === item.path ? "secondary" : "ghost"} // Highlight active link
                   className="w-full justify-start gap-3 text-white hover:bg-indigo-600/30"
                   aria-current={window.location.pathname === item.path ? "page" : undefined}
                 >
                   <item.icon className="w-5 h-5" />
                   {item.label}
                 </Button>
               ))}
             </div>
        </div>

      {/* Mobile Menu (Drawer) */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }} // Start off-screen left
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }} // Adjusted animation
            className="fixed left-0 top-16 bottom-0 w-64 glass-panel border-r border-indigo-500/30 z-40 overflow-y-auto scrollbar-hide lg:hidden" // Hide on large screens
          >
            <div className="p-4 space-y-2">
              {filteredMenuItems.map((item) => (
                <Button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMenuOpen(false); // Close menu on navigation
                  }}
                  variant={window.location.pathname === item.path ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3 text-white hover:bg-indigo-600/30"
                  aria-current={window.location.pathname === item.path ? "page" : undefined}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {/* Adjusted padding-left for large screens to account for sidebar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pl-72">
        {children}
      </main>
    </div>
  );
};

export default Layout;

