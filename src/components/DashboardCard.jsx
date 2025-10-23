import React from 'react';
    import { motion } from 'framer-motion';
    import { Clock, CheckSquare, Package, Users, DollarSign, FileText, MapPin, BarChartHorizontalBig } from 'lucide-react'; // Added Payroll Icon
    import Layout from '@/components/Layout';
    import DashboardCard from '@/components/DashboardCard';
    import PayrollReport from '@/components/PayrollReport'; // Import the new component

    // Receive db and appId props
    const Dashboard = ({ user, onLogout, db, appId }) => {

      // Define cards data
      const cards = [
        { title: 'Time & Attendance', icon: Clock, color: 'from-blue-500 to-cyan-500', link: '/time-attendance' },
        { title: 'Project Management', icon: CheckSquare, color: 'from-purple-500 to-pink-500', link: '/projects' }, // Changed link
        { title: 'Inventory', icon: Package, color: 'from-green-500 to-emerald-500', link: '/inventory' },
        { title: 'HR', icon: Users, color: 'from-orange-500 to-red-500', link: '/hr' }, // Changed title to match component
        { title: 'Finance', icon: DollarSign, color: 'from-yellow-500 to-amber-500', link: '/finance' },
        { title: 'Reports', icon: FileText, color: 'from-indigo-500 to-purple-500', link: '/reports' },
      ];

      // Filter cards based on user role
       // Adjusted filter logic to be more specific and include Dashboard
       const visibleMenuItems = user.role === 'Admin'
         ? menuItems // Admin sees all
         : user.role === 'Manager'
         ? menuItems.filter(item => item.label !== 'HR' && item.label !== 'Finance') // Manager sees most except HR/Finance
         : user.role === 'Field Employee'
         ? menuItems.filter(item => item.label === 'Dashboard' || item.label === 'Time & Attendance' || item.label === 'Reports') // Field Worker sees limited
         : [menuItems.find(item => item.label === 'Dashboard')]; // Default to just Dashboard if role unknown


      // Filter cards for display on dashboard grid
      const filteredCards = user.role === 'Admin'
        ? cards // Admin sees all cards
        : user.role === 'Manager'
        ? cards.filter(card => card.title !== 'HR' && card.title !== 'Finance') // Manager sees most
        : user.role === 'Field Employee'
        ? cards.filter(card => card.title === 'Time & Attendance' || card.title === 'Reports') // Field Worker sees limited
        : []; // Default empty


      // Determine if Payroll report should be shown
      const showPayroll = user?.role === 'Admin';

      return (
        // Pass db and appId to Layout if needed by Layout itself, or just pass down to children
        <Layout user={user} onLogout={onLogout} title="Dashboard" /* Pass db and appId here if Layout uses them */ >
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="graffiti-bg rounded-2xl p-6 neon-border"
            >
              <div className="flex items-center gap-4">
                {/* <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}> */}
                  <MapPin className="w-12 h-12 text-white" />
                {/* </motion.div> */}
                <div>
                   {/* Use user.email if name isn't set during registration yet */}
                  <h2 className="text-2xl font-bold text-white">Welcome, {user.displayName || user.email || 'User'}!</h2>
                   {/* Display role if available */}
                   {user.role && <p className="text-indigo-200">Role: {user.role}</p>}
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map((card, index) => (
                <DashboardCard key={card.link || index} {...card} delay={index * 0.1} /> // Use link as key if available
              ))}
               {/* Add a placeholder card if needed, e.g., for Payroll link */}
               {/* {showPayroll && (
                   <DashboardCard
                       title="Payroll Report"
                       icon={BarChartHorizontalBig}
                       color="from-teal-500 to-cyan-600"
                       link="/payroll" // Needs a route in App.jsx
                       delay={filteredCards.length * 0.1}
                   />
               )} */}
            </div>

            {/* Conditionally render Payroll Report for Admin */}
            {showPayroll && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }} // Adjust delay as needed
              >
                {/* Pass db and appId to the PayrollReport */}
                <PayrollReport db={db} appId={appId} />
              </motion.div>
            )}

            {/* Quick Stats Placeholder - make dynamic later */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: showPayroll ? 0.7 : 0.6 }} // Adjust delay based on Payroll visibility
              className="glass-panel rounded-xl p-6 neon-border"
            >
              <h3 className="text-xl font-bold mb-4 neon-text">Quick Stats (Placeholder)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
                  <p className="text-3xl font-bold text-cyan-400">--</p>
                  <p className="text-sm text-gray-400">Active Tasks</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg">
                  <p className="text-3xl font-bold text-emerald-400">--</p>
                  <p className="text-sm text-gray-400">Items in Stock</p>
                </div>
                 {/* Add more stats as needed */}
                 <div className="text-center p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg">
                   <p className="text-3xl font-bold text-red-400">--</p>
                   <p className="text-sm text-gray-400">Employees</p>
                 </div>
                 <div className="text-center p-4 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-lg">
                    <p className="text-3xl font-bold text-amber-400">₱ --</p>
                    <p className="text-sm text-gray-400">Total Expenses</p>
                  </div>
              </div>
            </motion.div>
          </div>
        </Layout>
      );
    };

    export default Dashboard;

