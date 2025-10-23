import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth'; // Added getIdTokenResult
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
import UserManagement from './pages/UserManagement'; // Import the new page
import { Toaster } from '@/components/ui/toaster';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyAb3yafzh-O4VkxkMGKyTxXGi8XOIJ0mfk",
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

// Enable Firestore debug logging (optional)
// setLogLevel('debug');

function App() {
  const [user, setUser] = useState(null); // Will store user object AND role
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => { // Make async
      if (firebaseUser) {
        try {
          // --- Fetch Custom Claims (Role) ---
          const idTokenResult = await getIdTokenResult(firebaseUser, true); // Force refresh to get latest claims
          const userRole = idTokenResult.claims.role || null; // Get role, default to null if not set

          // Store user object and role together
          setUser({ ...firebaseUser, role: userRole });
          console.log("User signed in:", firebaseUser.email, "Role:", userRole); // Log role

        } catch (error) {
          console.error("Error fetching custom claims:", error);
          // Still set user, but without role - app might behave unexpectedly
          setUser({ ...firebaseUser, role: null });
        }
      } else {
        // User is signed out
        setUser(null);
        console.log("User signed out.");
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []); // Run only once

  const handleLogout = () => {
    signOut(authInstance).catch((error) => console.error("Logout Error:", error));
  };

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
      return <Navigate to="/login" replace />;
    }
    // If allowedRoles are specified, check if user's role is included
    if (allowedRoles && !allowedRoles.includes(user.role)) {
       console.warn(`Access denied for role "${user.role}" to route requiring roles: ${allowedRoles.join(', ')}`);
      // Redirect to dashboard or show an unauthorized page
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  // --- Props to pass down to all protected pages ---
  const pageProps = {
    user, // This now includes user.role
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
          {/* Login route */}
          <Route
            path="/login"
            element={!user ? <Login auth={authInstance} /> : <Navigate to="/dashboard" replace />}
          />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard {...pageProps} /></ProtectedRoute>} />
          <Route path="/time-attendance" element={<ProtectedRoute><TimeAttendance {...pageProps} /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><ProjectManagement {...pageProps} /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><Inventory {...pageProps} /></ProtectedRoute>} />
          <Route path="/hr" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><HR {...pageProps} /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><Finance {...pageProps} /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports {...pageProps} /></ProtectedRoute>} />

           {/* --- New User Management Route (Admin/Manager Only) --- */}
           <Route
               path="/user-management"
               element={
                   <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                       <UserManagement {...pageProps} />
                   </ProtectedRoute>
               }
           />

          {/* Default route */}
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
          {/* Handle the '/tasks' link */}
          <Route path="/tasks" element={<Navigate to="/projects" replace />} />

           {/* Catch-all for unknown routes (optional) */}
           <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

        </Routes>
      </Router>
      <Toaster />
    </>
  );
}

export default App;

