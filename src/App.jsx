import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth'; // Removed unused imports, Added getIdTokenResult
import { getFirestore, setLogLevel } from 'firebase/firestore';

// Page Imports
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TimeAttendance from './pages/TimeAttendance';
import ProjectManagement from './pages/ProjectManagement';
import Inventory from './pages/Inventory';
import HR from './pages/HR';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement'; // Added UserManagement
import { Toaster } from '@/components/ui/toaster';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyAb3yafzh-O4VkxkMGKyTxXGi8XOIJ0mfk", // Keep your actual config
  authDomain: "reportdashboard-c6f0d.firebaseapp.com",
  projectId: "reportdashboard-c6f0d",
  storageBucket: "reportdashboard-c6f0d.firebasestorage.app",
  messagingSenderId: "462874854819",
  appId: "1:462874854819:web:7c9426ed77c9e560688616",
  measurementId: "G-9V60KWRX7G"
};

const app = initializeApp(firebaseConfig);
const authInstance = getAuth(app);
const dbInstance = getFirestore(app);

// Optional: Enable Firestore debug logging locally if needed
// setLogLevel('debug');

function App() {
  const [user, setUser] = useState(null); // User object including role
  const [isAuthReady, setIsAuthReady] = useState(false); // Loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, now get their custom claims (role)
        try {
          // Force refresh to get latest claims after manual setting
          const idTokenResult = await getIdTokenResult(firebaseUser, true);
          const userRole = idTokenResult.claims.role || null; // Get role, default to null if not set
          console.log(`User signed in: ${firebaseUser.email} Role: ${userRole}`); // Log role
          // Set user state *with* the role included
          setUser({ ...firebaseUser, role: userRole });
        } catch (error) {
          console.error("Error fetching user claims:", error);
          // Still set user, but role might be missing
          setUser({ ...firebaseUser, role: null });
        }
      } else {
        // User is signed out
        console.log("User signed out.");
        setUser(null);
      }
      // Set ready AFTER attempting to get claims (or if signed out)
      setIsAuthReady(true);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleLogout = () => {
    signOut(authInstance).catch((error) => console.error("Logout Error:", error));
  };

  // Show a loading indicator while Firebase checks auth state AND claims
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-950">
        <div className="text-2xl font-orbitron neon-text">Loading ERP...</div>
      </div>
    );
  }

  // --- Protected Route Helper ---
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) {
      // If user is not logged in, redirect to login page
      return <Navigate to="/login" replace />;
    }
    // If allowedRoles are specified, check if the user's role is included
    // Ensure user.role exists before checking
    if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
       // If role is required but user doesn't have it (or it's wrong), redirect to dashboard
       console.warn(`Access denied for role "${user.role}" to route requiring roles: ${allowedRoles.join(', ')}`);
       return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  // --- Props to pass down to all protected pages ---
  const pageProps = {
    user, // This now includes the 'role' property
    onLogout: handleLogout,
    auth: authInstance,
    db: dbInstance,
    appId: firebaseConfig.projectId
  };

  return (
    <>
      <Helmet>
        <title>Field ERP - Enterprise Resource Planning</title>
        <meta name="description" content="Mobile-first ERP system for field operations, time tracking, task management, and resource coordination" />
      </Helmet>
      <Router>
        <Routes>
          {/* Login route - redirect if already logged in */}
          <Route
            path="/login"
            element={!user ? <Login auth={authInstance} /> : <Navigate to="/dashboard" replace />}
          />

          {/* Protected Routes */}
          {/* Dashboard is accessible to all logged-in users */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard {...pageProps} /></ProtectedRoute>}
          />
          {/* Time & Attendance - Accessible to all */}
           <Route
             path="/time-attendance"
             element={<ProtectedRoute><TimeAttendance {...pageProps} /></ProtectedRoute>}
           />
           {/* Project Management - Accessible to Admin & Manager */}
           <Route
             path="/projects"
             element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><ProjectManagement {...pageProps} /></ProtectedRoute>}
           />
           {/* Inventory - Accessible to Admin & Manager */}
           <Route
             path="/inventory"
             element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><Inventory {...pageProps} /></ProtectedRoute>}
           />
           {/* HR - Accessible only to Admin */}
           <Route
             path="/hr"
             element={<ProtectedRoute allowedRoles={['Admin']}><HR {...pageProps} /></ProtectedRoute>}
           />
           {/* Finance - Accessible only to Admin */}
           <Route
             path="/finance"
             element={<ProtectedRoute allowedRoles={['Admin']}><Finance {...pageProps} /></ProtectedRoute>}
           />
            {/* User Management - Accessible to Admin & Manager */}
            <Route
              path="/user-management"
              element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><UserManagement {...pageProps} /></ProtectedRoute>}
            />
          {/* Reports - Accessible to all */}
          <Route
            path="/reports"
            element={<ProtectedRoute><Reports {...pageProps} /></ProtectedRoute>}
          />

          {/* Default route */}
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
          {/* Handle the '/tasks' link */}
          <Route path="/tasks" element={<Navigate to="/projects" replace />} />

           {/* Fallback for unknown routes */}
           <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

        </Routes>
      </Router>
      <Toaster />
    </>
  );
}

export default App;
