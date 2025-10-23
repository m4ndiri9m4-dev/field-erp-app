import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Home, Clock, Briefcase, Package, Users, DollarSign, FileText, UserCog } from 'lucide-react'; // Added UserCog
import { Button } from '@/components/ui/button';

// Receive user prop which now contains user.role
const Layout = ({ children, user, onLogout, title }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Base menu items
  const baseMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard', roles: ['Admin', 'Manager', 'Field Employee', 'Office Staff'] }, // All roles
    { icon: Clock, label: 'Time & Attendance', path: '/time-attendance', roles: ['Admin', 'Manager', 'Field Employee'] },
    { icon: Briefcase, label: 'Project Management', path: '/projects', roles: ['Admin', 'Manager'] },
    { icon: Package, label: 'Inventory', path: '/inventory', roles: ['Admin', 'Manager'] },
    { icon: Users, label: 'HR', path: '/hr', roles: ['Admin', 'Manager'] },
    { icon: DollarSign, label: 'Finance', path: '/finance', roles: ['Admin', 'Manager'] },
    { icon: FileText, label: 'Reports', path: '/reports', roles: ['Admin', 'Manager', 'Field Employee'] },
    // --- New User Management Item ---
    { icon: UserCog, label: 'User Management', path: '/user-management', roles: ['Admin', 'Manager'] },
  ];

  // Filter menu items based on the logged-in user's role
  const filteredMenuItems = baseMenuItems.filter(item =>
      item.roles.includes(user?.role) // Check if user.role is in the item's allowed roles
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"> {/* Added subtle gradient */}
      <nav className="glass-panel border-b border-indigo-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white hover:bg-indigo-500/20 lg:hidden" // Hide on larger screens initially
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
              <h1 className="text-xl font-bold neon-text">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
               {/* Display user email and role */}
              <div className="text-right hidden sm:block">
                  <p className="text-sm text-white font-medium truncate max-w-[150px]">{user?.displayName || user?.email}</p>
                  <p className="text-xs text-indigo-300">{user?.role || 'User'}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                aria-label="Logout" // Added aria-label
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex"> {/* Flex container for sidebar and main content */}
        {/* Sidebar for larger screens */}
        <motion.div
           initial={{ width: 0 }}
           animate={{ width: 256 }} // Fixed width for large screens
           transition={{ type: 'spring', damping: 20, stiffness: 100 }}
           className="hidden lg:block fixed left-0 top-16 bottom-0 w-64 glass-panel border-r border-indigo-500/30 z-40 overflow-y-auto scrollbar-hide"
         >
           <div className="p-4 space-y-2">
             {filteredMenuItems.map((item) => (
               <Button
                 key={item.path}
                 variant="ghost" // Use ghost variant for sidebar
                 onClick={() => {
                   navigate(item.path);
                   // No need to close menu on large screens
                 }}
                 className={`w-full justify-start gap-3 hover:bg-indigo-600/30 text-indigo-200 hover:text-white ${
                    location.pathname === item.path ? 'bg-indigo-600/40 text-white font-semibold' : '' // Active state
                 }`}
               >
                 <item.icon className="w-5 h-5" />
                 {item.label}
               </Button>
             ))}
           </div>
        </motion.div>

         {/* Mobile Menu (Slide-out) */}
         <AnimatePresence>
           {isMenuOpen && (
             <motion.div
               initial={{ x: '-100%' }}
               animate={{ x: 0 }}
               exit={{ x: '-100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 150 }}
               className="fixed left-0 top-16 bottom-0 w-64 glass-panel border-r border-indigo-500/30 z-40 overflow-y-auto scrollbar-hide lg:hidden" // Only show on smaller screens
             >
               <div className="p-4 space-y-2">
                 {filteredMenuItems.map((item) => (
                   <Button
                     key={item.path}
                     variant="ghost"
                     onClick={() => {
                       navigate(item.path);
                       setIsMenuOpen(false); // Close menu on mobile click
                     }}
                      className={`w-full justify-start gap-3 hover:bg-indigo-600/30 text-indigo-200 hover:text-white ${
                         location.pathname === item.path ? 'bg-indigo-600/40 text-white font-semibold' : ''
                     }`}
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
         <main className="flex-1 lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8"> {/* Add margin-left for large screens */}
             {children}
         </main>
      </div>
    </div>
  );
};

export default Layout;
