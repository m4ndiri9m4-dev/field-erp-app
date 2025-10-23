import React from 'react';
import {
  Clock,
  Briefcase,
  Archive,
  Users,
  DollarSign,
  BarChart2
} from 'lucide-react';
import DashboardCard from '../components/DashboardCard'; // Adjust this import path if needed

// This is the main Dashboard component that uses your card
const Dashboard = ({ user, onLogout }) => {
  // Array of dashboard items to create cards dynamically
  const dashboardItems = [
    {
      title: 'Time & Attendance',
      icon: Clock,
      color: 'from-cyan-500 to-blue-500',
      link: '/time-attendance',
      delay: 0.1,
    },
    {
      title: 'Project Management',
      icon: Briefcase,
      color: 'from-green-500 to-teal-500',
      link: '/projects',
      delay: 0.2,
    },
    {
      title: 'Inventory',
      icon: Archive,
      color: 'from-orange-500 to-amber-500',
      link: '/inventory',
      delay: 0.3,
    },
    {
      title: 'HR Management',
      icon: Users,
      color: 'from-purple-500 to-indigo-500',
      link: '/hr',
      delay: 0.4,
    },
    {
      title: 'Finance',
      icon: DollarSign,
      color: 'from-red-500 to-pink-500',
      link: '/finance',
      delay: 0.5,
    },
    {
      title: 'Reports',
      icon: BarChart2,
      color: 'from-yellow-500 to-lime-500',
      link: '/reports',
      delay: 0.6,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-700">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl font-orbitron neon-text">
            Dashboard
          </h1>
          <p className="text-gray-400">
            Welcome, {user.email || 'User'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="hidden text-sm text-gray-300 md:block">
            User ID: {user.uid}
          </span>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-md shadow-lg hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 focus:ring-offset-slate-900"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardItems.map((item) => (
            <DashboardCard
              key={item.title}
              title={item.title}
              icon={item.icon}
              color={item.color}
              link={item.link}
              delay={item.delay}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

