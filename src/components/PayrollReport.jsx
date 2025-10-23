import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Calendar as CalendarIcon, User, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button'; // Assuming button exists
// Charting Library
import { BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

// --- Firestore Imports ---
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp // Import Timestamp for date comparisons if needed
} from 'firebase/firestore';

// --- Chart Colors ---
const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d0ed57', '#a4de6c', '#ff8042', '#00C49F'];


// --- Date Range Helper (Example: Last 7 days) ---
const getLastNDaysRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    start.setHours(0, 0, 0, 0); // Start of the day N days ago
    end.setHours(23, 59, 59, 999); // End of today
    return { start, end };
};

// --- Salary Calculation Logic ---
const calculatePayroll = (attendanceRecords, employees) => {
    const payrollData = {}; // employeeId -> { name, rate, records: [], daysWorked: 0, totalPay: 0 }
    const dailyAttendance = {}; // YYYY-MM-DD -> { employeeId -> { clockIn: Date, clockOut: Date } }

    // 1. Group records by day and employee ID
    attendanceRecords.forEach(record => {
        const recordDate = new Date(record.timestamp);
        const dateStr = recordDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const userId = record.userId;

        if (!dailyAttendance[dateStr]) {
            dailyAttendance[dateStr] = {};
        }
        if (!dailyAttendance[dateStr][userId]) {
            dailyAttendance[dateStr][userId] = { clockIn: null, clockOut: null };
        }

        if (record.type === 'clock-in' && (!dailyAttendance[dateStr][userId].clockIn || recordDate < dailyAttendance[dateStr][userId].clockIn)) {
            dailyAttendance[dateStr][userId].clockIn = recordDate;
        } else if (record.type === 'clock-out' && (!dailyAttendance[dateStr][userId].clockOut || recordDate > dailyAttendance[dateStr][userId].clockOut)) {
            dailyAttendance[dateStr][userId].clockOut = recordDate;
        }
    });

    // 2. Iterate through employees to initialize payroll data
    employees.forEach(emp => {
        payrollData[emp.id] = {
            id: emp.id,
            name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
            email: emp.email || 'N/A',
            rate: Number(emp.dailyRate) || 0,
            records: [], // Store daily summary for table
            daysWorked: 0,
            totalPay: 0,
        };
    });

    // 3. Calculate days worked and pay for each employee
    Object.keys(dailyAttendance).forEach(dateStr => {
        Object.keys(dailyAttendance[dateStr]).forEach(userId => {
             // Find corresponding employee in the main employee list
             const employee = employees.find(emp => emp.userId === userId); // Assuming employee doc has userId
             const employeeId = employee?.id; // Get the Firestore document ID

             if (!employeeId || !payrollData[employeeId]) {
                 console.warn(`No employee data found for attendance record userId: ${userId} on ${dateStr}`);
                 return; // Skip if no matching employee in the current list
             }

            const attendanceDay = dailyAttendance[dateStr][userId];
            if (attendanceDay.clockIn && attendanceDay.clockOut) {
                // Basic Calculation: Count as 1 day worked if both clock-in and clock-out exist
                payrollData[employeeId].daysWorked += 1;
                payrollData[employeeId].records.push({
                    date: dateStr,
                    clockIn: attendanceDay.clockIn.toLocaleTimeString(),
                    clockOut: attendanceDay.clockOut.toLocaleTimeString(),
                    payForDay: payrollData[employeeId].rate
                });
            } else {
                 // Optionally record incomplete days
                 payrollData[employeeId].records.push({
                     date: dateStr,
                     clockIn: attendanceDay.clockIn ? attendanceDay.clockIn.toLocaleTimeString() : 'Missing',
                     clockOut: attendanceDay.clockOut ? attendanceDay.clockOut.toLocaleTimeString() : 'Missing',
                     payForDay: 0 // No pay for incomplete day (adjust logic as needed)
                 });
            }
        });
    });

     // 4. Calculate total pay
     Object.keys(payrollData).forEach(employeeId => {
         payrollData[employeeId].totalPay = payrollData[employeeId].daysWorked * payrollData[employeeId].rate;
     });

    // Convert payrollData object to an array for rendering
    return Object.values(payrollData).sort((a, b) => a.name.localeCompare(b.name));
};

// --- Main Payroll Component ---
const PayrollReport = ({ db, appId }) => {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
   const [dateRange, setDateRange] = useState(getLastNDaysRange(7)); // Default: Last 7 days

  const employeesCollectionPath = `artifacts/${appId}/public/data/employees`;
  const attendanceCollectionPath = `artifacts/${appId}/public/data/attendance`;

  // Fetch Employees
  useEffect(() => {
    if (!db || !appId) return;
    setLoading(true);
    const q = query(collection(db, employeesCollectionPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // Keep loading until attendance is also fetched
    }, (err) => {
      console.error("Error fetching employees:", err);
      setError("Failed to load employee data.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId, employeesCollectionPath]);

  // Fetch Attendance Records (within date range - adjust if needed for large datasets)
  useEffect(() => {
    if (!db || !appId) return;
    setLoading(true);

    const q = query(
        collection(db, attendanceCollectionPath),
        orderBy("timestamp", "desc") // Fetch all and filter client-side for simplicity, or add where clauses
        // For large datasets, add Firestore where clauses:
        // where("timestamp", ">=", Timestamp.fromDate(dateRange.start)),
        // where("timestamp", "<=", Timestamp.fromDate(dateRange.end))
        // This requires composite indexes in Firestore
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
           // Filter client-side based on date range
           .filter(rec => {
               const recDate = new Date(rec.timestamp);
               return recDate >= dateRange.start && recDate <= dateRange.end;
           });

      setAttendanceRecords(records);
      setLoading(false); // Loading finished after both fetches (or combined)
      setError(null);
    }, (err) => {
      console.error("Error fetching attendance:", err);
      setError("Failed to load attendance data.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId, attendanceCollectionPath, dateRange]); // Refetch when dateRange changes

  // --- Calculate Payroll Data ---
  const payrollResults = useMemo(() => {
    if (loading || employees.length === 0 || attendanceRecords.length === 0) {
      return [];
    }
    return calculatePayroll(attendanceRecords, employees);
  }, [attendanceRecords, employees, loading]);


   // --- Data for Charts ---
   const attendancePerEmployee = useMemo(() => {
       return payrollResults.map(emp => ({
           name: emp.name.split(' ')[0], // First name
           daysWorked: emp.daysWorked
       })).filter(emp => emp.daysWorked > 0); // Only show employees who worked
   }, [payrollResults]);

   const attendanceByDay = useMemo(() => {
       const dailyCounts = {};
       attendanceRecords.forEach(rec => {
           if (rec.type === 'clock-in') { // Count clock-ins per day
              const dateStr = new Date(rec.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric'});
              dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
           }
       });
       // Format for chart, sort by date might be needed if keys aren't ordered
       return Object.entries(dailyCounts).map(([name, value]) => ({ name, value }));
   }, [attendanceRecords]);


  // --- Render ---
  if (error) {
    return <div className="text-red-400 p-4 text-center">{error}</div>;
  }

  return (
    <div className="space-y-6">
       <h3 className="text-xl font-bold neon-text">Payroll & Attendance Report</h3>
        {/* Date Range Selector Placeholder */}
        <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">
                Range: {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
            </span>
             {/* Basic buttons to change range - replace with proper date picker */}
             <Button size="sm" variant="outline" onClick={() => setDateRange(getLastNDaysRange(7))}>Last 7 Days</Button>
             <Button size="sm" variant="outline" onClick={() => setDateRange(getLastNDaysRange(30))}>Last 30 Days</Button>
        </div>


        {/* Attendance Charts */}
        <div className="glass-panel rounded-xl p-6 neon-border">
             <h4 className="text-lg font-semibold neon-text mb-4">Attendance Overview</h4>
             {loading ? (
                  <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
             ) : attendanceRecords.length === 0 ? (
                 <p className="text-gray-400 text-center py-10">No attendance data for this period.</p>
             ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-72">
                     {/* Bar Chart: Attendance per Employee */}
                    <div>
                        <h5 className="text-sm font-semibold text-center mb-2 text-indigo-300">Days Worked per Employee</h5>
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={attendancePerEmployee} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis type="number" allowDecimals={false} fontSize="10px" stroke="#9ca3af" />
                                <YAxis dataKey="name" type="category" fontSize="10px" stroke="#9ca3af" width={60} />
                                <Tooltip formatter={(value) => `${value} days`} />
                                <Bar dataKey="daysWorked" fill="#8884d8">
                                    <LabelList dataKey="daysWorked" position="right" fontSize="10px" fill="#fff" />
                                </Bar>
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>

                     {/* Bar Chart: Attendance by Day */}
                     <div>
                         <h5 className="text-sm font-semibold text-center mb-2 text-indigo-300">Daily Clock-Ins</h5>
                         <ResponsiveContainer width="100%" height="100%">
                             <RechartsBarChart data={attendanceByDay} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                 <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                 <XAxis dataKey="name" fontSize="10px" stroke="#9ca3af" />
                                 <YAxis fontSize="10px" stroke="#9ca3af" allowDecimals={false}/>
                                 <Tooltip formatter={(value) => `${value} clock-ins`} cursor={{fill: 'rgba(110, 118, 147, 0.1)'}}/>
                                 <Bar dataKey="value" fill="#82ca9d" name="Clock-ins" />
                             </RechartsBarChart>
                         </ResponsiveContainer>
                     </div>
                </div>
             )}
        </div>


        {/* Payroll Table */}
        <div className="glass-panel rounded-xl p-4 neon-border">
          <h4 className="text-lg font-semibold neon-text mb-4 px-2">Payroll Summary</h4>
          {loading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="ml-3">Calculating Payroll...</p>
            </div>
           ) : payrollResults.length === 0 ? (
             <div className="text-center py-10">
                 <DollarSign className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                 <p className="text-lg text-gray-400">No payroll data to display for this period.</p>
                 <p className="text-sm text-gray-500">Ensure employees have daily rates and attendance records exist.</p>
             </div>
           ) : (
                <div className="max-h-96 overflow-y-auto scrollbar-hide">
                   <Table>
                     <TableHeader>
                       <TableRow className="border-b-indigo-500/30 hover:bg-transparent sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                         <TableHead className="text-indigo-300">Employee</TableHead>
                         <TableHead className="text-indigo-300">Email</TableHead>
                         <TableHead className="text-right text-indigo-300">Daily Rate</TableHead>
                         <TableHead className="text-right text-indigo-300">Days Worked</TableHead>
                         <TableHead className="text-right text-indigo-300">Total Pay</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {payrollResults.map((emp) => (
                         <TableRow key={emp.id} className="border-b-slate-700/50">
                           <TableCell className="font-medium text-white">{emp.name || emp.id}</TableCell>
                           <TableCell className="text-gray-400 text-xs">{emp.email}</TableCell>
                           <TableCell className="text-right text-gray-300">
                                ₱{emp.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </TableCell>
                           <TableCell className="text-right text-white">{emp.daysWorked}</TableCell>
                           <TableCell className="text-right font-semibold text-green-400">
                               ₱{emp.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
               </div>
           )}
        </div>
    </div>
  );
};

export default PayrollReport;
