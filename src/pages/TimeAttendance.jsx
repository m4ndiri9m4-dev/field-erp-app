import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, Clock, Calendar } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import MapView from '@/components/MapView';

// --- Firestore Imports ---
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';

const TimeAttendance = ({ user, onLogout, db }) => {
  const [location, setLocation] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Firestore Logic ---
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const attendanceCollectionPath = `artifacts/${appId}/public/data/attendance`;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for attendance records AND check current status
  useEffect(() => {
    if (!db || !user) return;
    
    setLoading(true);
    // Query for records for THIS user only, ordered by most recent
    const q = query(
      collection(db, attendanceCollectionPath),
      where("userId", "==", user.uid)
      // orderBy("timestamp", "desc") // orderBy requires an index, skip for simplicity
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const recordsData = [];
      querySnapshot.forEach((doc) => {
        recordsData.push({ ...doc.data(), id: doc.id });
      });
      
      // Sort in JS to avoid index requirement
      recordsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setAttendanceRecords(recordsData);

      // Check the most recent record to see if user is clocked in
      if (recordsData.length > 0) {
        setClockedIn(recordsData[0].type === 'clock-in');
      } else {
        setClockedIn(false);
      }
      setLoading(false);

    }, (error) => {
      console.error("Error listening to attendance:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, user, appId]);


  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast({
            title: "Location Captured! 📍",
            description: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`,
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enable GPS.",
            variant: "destructive",
          });
        }
      );
    }
  };

  // --- Replaced localStorage.setItem with addDoc ---
  const handleClockIn = async () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please capture your location first!",
        variant: "destructive",
      });
      return;
    }

    const record = {
      type: 'clock-in',
      timestamp: new Date().toISOString(),
      location: location,
      userId: user.uid, // Track who clocked in
      userEmail: user.email
    };

    try {
      await addDoc(collection(db, attendanceCollectionPath), record);
      // setClockedIn(true) will be handled by the onSnapshot listener
      toast({
        title: "Clocked In! ⏰",
        description: "Your attendance has been recorded.",
      });
    } catch (error) {
      console.error("Error clocking in:", error);
    }
  };

  const handleClockOut = async () => {
    const record = {
      type: 'clock-out',
      timestamp: new Date().toISOString(),
      location: location, // Use last known location if not recaptured
      userId: user.uid,
      userEmail: user.email
    };

    try {
      await addDoc(collection(db, attendanceCollectionPath), record);
      // setClockedIn(false) will be handled by the onSnapshot listener
      toast({
        title: "Clocked Out! 👋",
        description: "Have a great day!",
      });
    } catch (error) {
      console.error("Error clocking out:", error);
    }
  };

  const handleSelfie = () => {
    toast({
      title: "📸 Camera Feature",
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  return (
    <Layout user={user} onLogout={onLogout} title="Time & Attendance">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-6 neon-border"
        >
          <div className="text-center space-y-4">
            <Clock className="w-16 h-16 mx-auto text-indigo-400" />
            <h2 className="text-4xl font-bold neon-text">
              {currentTime.toLocaleTimeString()}
            </h2>
            <p className="text-gray-400 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-xl p-6 neon-border space-y-4"
        >
          <h3 className="text-xl font-bold neon-text">Clock In/Out</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={getLocation}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Capture Location
            </Button>
            
            <Button
              onClick={handleSelfie}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Selfie
            </Button>
          </div>

          {location && (
            <div className="h-64 rounded-lg overflow-hidden">
              <MapView location={location} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleClockIn}
              disabled={clockedIn || loading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
            >
              Clock In
            </Button>
            
            <Button
              onClick={handleClockOut}
              disabled={!clockedIn || loading}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50"
            >
              Clock Out
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-xl p-6 neon-border"
        >
          <h3 className="text-xl font-bold neon-text mb-4">My Recent Records</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
            {loading && <p className="text-gray-400 text-center">Loading records...</p>}
            {!loading && attendanceRecords.slice(0, 10).map((record) => ( // Already sorted
              <div key={record.id} className="bg-slate-900/50 rounded-lg p-3 border border-indigo-500/20">
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${record.type === 'clock-in' ? 'text-green-400' : 'text-red-400'}`}>
                    {record.type === 'clock-in' ? '🟢 Clock In' : '🔴 Clock Out'}
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(record.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default TimeAttendance;
