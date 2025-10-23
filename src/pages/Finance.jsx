import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Plus, TrendingUp, TrendingDown, Trash2, Loader2, PieChart, BarChart } from 'lucide-react'; // Added chart icons
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // *** REMOVED THIS LINE ***
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Added Table components

// Charting Library
import { BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';


// --- Firestore Imports ---
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  where, // Needed for potential manager filtering
  getDocs // Needed for potential manager filtering
} from 'firebase/firestore';


// --- Helper Function to Remove Undefined Fields ---
// (Keep the robust version from previous steps)
const cleanDataForFirestore = (data, isNew = false) => {
    const cleanedData = {};
    for (const key in data) {
      if (data[key] !== undefined) {
          // Convert empty strings for potentially optional fields to null
          if (['description', 'category', 'addedBy'].includes(key) && data[key] === '') {
              cleanedData[key] = null;
          } else {
            cleanedData[key] = data[key];
          }
      }
    }
    if (isNew) {
        delete cleanedData.id;
    }
      // Ensure amount is a number or 0
      if (cleanedData.amount !== undefined) {
          cleanedData.amount = Number(cleanedData.amount) || 0;
      }
    return cleanedData;
};

// --- Chart Colors ---
const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d0ed57', '#a4de6c'];


const Finance = ({ user, onLogout, db, appId }) => {
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Operations' });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]); // Needed for manager filtering
  // const [projects, setProjects] = useState([]); // No longer needed if not filtering projects by managerEmail here
  const [managerProjects, setManagerProjects] = useState([]); // Store manager's project IDs

  // --- Firestore Logic ---
  const expensesCollectionPath = `artifacts/${appId}/public/data/expenses`;
  const employeesCollectionPath = `artifacts/${appId}/public/data/employees`;
  const projectsCollectionPath = `artifacts/${appId}/public/data/projects`;


  // Fetch employees and projects (needed for manager filtering)
  useEffect(() => {
      // Only fetch if the current user is a Manager
      if (!db || !appId || user?.role !== 'Manager') return;

      let unsubEmployees = () => {};
      let unsubProjects = () => {};
      let mounted = true; // Prevent state updates after unmount

       // Fetch employees to link expense 'addedBy' email to employee project assignments
       console.log("Manager detected, fetching employees and projects for filtering...");
       const empQuery = query(collection(db, employeesCollectionPath));
       unsubEmployees = onSnapshot(empQuery, (snapshot) => {
           if (mounted) {
               const fetchedEmployees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
               console.log("Fetched employees for manager:", fetchedEmployees);
               setEmployees(fetchedEmployees);
           }
       }, (error) => console.error("Error fetching employees for manager filter:", error));

       // Fetch projects to find which ones the manager oversees
       // --- PLACEHOLDER --- This query assumes projects have a 'managerEmail' field matching the user's email.
       // Adjust if your project data uses a different field (like managerId).
       const projQuery = query(collection(db, projectsCollectionPath), where("managerEmail", "==", user.email));
       unsubProjects = onSnapshot(projQuery, (snapshot) => {
           if (mounted) {
               const managedProjectIds = snapshot.docs.map(doc => doc.id);
               console.log("Fetched manager's project IDs:", managedProjectIds);
               setManagerProjects(managedProjectIds); // Store IDs of projects managed by this user
           }
       }, (error) => console.error("Error fetching manager projects:", error));


       return () => {
           mounted = false;
           unsubEmployees();
           unsubProjects();
       };
  }, [db, appId, user, employeesCollectionPath, projectsCollectionPath]); // Added user dependency


  // Listen for expenses
  useEffect(() => {
    if (!db || !appId) {
        setLoading(false);
        return;
    }

    setLoading(true);
    let mounted = true; // Prevent state updates after unmount
    console.log(`Setting up listener for expenses at: ${expensesCollectionPath}`);

    // No initial filtering here, filter happens in useMemo based on role
    const q = query(collection(db, expensesCollectionPath));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!mounted) return;
      const expensesData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure amount is a number, default to 0 if not valid
        const amount = Number(data.amount);
        expensesData.push({ ...data, id: doc.id, amount: isNaN(amount) ? 0 : amount });
      });
        // Sort by date descending (handle potential missing dates)
        expensesData.sort((a, b) => {
            const dateA = a.addedAt ? new Date(a.addedAt) : 0;
            const dateB = b.addedAt ? new Date(b.addedAt) : 0;
            return dateB - dateA;
        });
        console.log("Fetched expenses:", expensesData);
      setExpenses(expensesData);
      setLoading(false);
    }, (error) => {
        if (!mounted) return;
      console.error("Error listening to expenses:", error);
      setLoading(false);
      toast({ title: "Error loading expenses", description: error.message, variant: "destructive" });
    });

    return () => {
        mounted = false;
        unsubscribe();
    };
  }, [db, appId, expensesCollectionPath]);


  // Filter expenses based on user role (using useMemo for efficiency)
  const filteredExpenses = useMemo(() => {
      // Don't filter until essential data is loaded
      if (loading || (user?.role === 'Manager' && (employees.length === 0 || managerProjects.length === 0) && expenses.length > 0)) {
         // If manager and employees/projects still loading BUT expenses ARE loaded, show nothing yet
         // to avoid briefly showing all expenses then filtering.
         if (user?.role === 'Manager') return [];
      }

      if (user?.role === 'Admin') {
          console.log("Filtering for Admin: Showing all expenses");
          return expenses; // Admin sees all
      }
      if (user?.role === 'Manager') {
           // Find emails of employees assigned ONLY to the projects this manager oversees
           const managedEmployeeEmails = employees
               .filter(emp => emp.projectId && managerProjects.includes(emp.projectId))
               .map(emp => emp.email?.toLowerCase()) // Use lowercase for matching
               .filter(email => !!email); // Remove any undefined/null emails

            console.log("Filtering for Manager. Managed emails:", managedEmployeeEmails);
           // Filter expenses where 'addedBy' (lowercased) matches one of the managed employees
           return expenses.filter(exp => exp.addedBy && managedEmployeeEmails.includes(exp.addedBy.toLowerCase()));
      }
      // Field Employee or other roles see only their own logged expenses
      console.log(`Filtering for ${user?.role}. Showing expenses added by: ${user?.email}`);
      return expenses.filter(exp => exp.addedBy?.toLowerCase() === user?.email?.toLowerCase());

  }, [expenses, user, employees, managerProjects, loading]); // Added loading


  // --- CRUD Operations ---

  const handleAddExpense = async () => {
     // Validate amount properly
     const amountValue = newExpense.amount.trim();
     const amountAsNumber = parseFloat(amountValue);

     if (!newExpense.description.trim() || !amountValue || isNaN(amountAsNumber) || amountAsNumber <= 0) {
       toast({ title: "Invalid Input", description: "Please enter a valid description and a positive amount.", variant: "destructive" });
       return;
     }

     // Use user's email from the user object passed as prop
     const addedByEmail = user?.email || 'Unknown';

     const expense = {
       description: newExpense.description.trim(),
       amount: amountAsNumber,
       category: newExpense.category,
       addedBy: addedByEmail, // Use authenticated user's email
       addedAt: new Date().toISOString() // Use ISO string for consistency
     };

     const cleanedExpense = cleanDataForFirestore(expense, true); // true for new item
     console.log("Attempting to add expense:", cleanedExpense);

     try {
       const docRef = await addDoc(collection(db, expensesCollectionPath), cleanedExpense); // Use cleaned data
       console.log("Expense added with ID:", docRef.id);
       setNewExpense({ description: '', amount: '', category: 'Operations' }); // Reset form
       setIsOpen(false);
       toast({ title: "Expense Logged! 💰" });
     } catch (error) {
       console.error("Error adding expense:", error);
       toast({ title: "Error Adding Expense", description: error.message, variant: "destructive" });
     }
  };

  const handleDeleteExpense = async (expenseId) => {
      if (!window.confirm("Are you sure you want to delete this expense? This action cannot be undone.")) return;
      console.log(`Attempting to delete expense: ${expenseId}`);
      try {
        await deleteDoc(doc(db, expensesCollectionPath, expenseId));
        console.log("Expense deleted successfully:", expenseId);
        toast({ title: "Expense Deleted 🗑️" }); // Make it less alarming
      } catch (error) {
        console.error("Error deleting expense:", error);
        toast({ title: "Error Deleting Expense", description: error.message, variant: "destructive" });
      }
  };


  // --- Data Processing for Charts ---
  const expenseByCategory = useMemo(() => {
    const categoryMap = {};
    filteredExpenses.forEach(exp => {
      const category = exp.category || 'Uncategorized';
      categoryMap[category] = (categoryMap[category] || 0) + exp.amount;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  // Example: Expenses over time (by month)
  const expenseOverTime = useMemo(() => {
      const monthMap = {};
      filteredExpenses.forEach(exp => {
          if (!exp.addedAt) return; // Skip if no date
          try {
              const date = new Date(exp.addedAt);
              // Ensure date is valid before proceeding
              if (isNaN(date.getTime())) {
                  console.warn("Invalid date found in expense:", exp.id, exp.addedAt);
                  return;
              }
              const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Format YYYY-MM
              monthMap[monthYear] = (monthMap[monthYear] || 0) + exp.amount;
          } catch (dateError) {
              console.warn("Error processing date for expense:", exp.id, exp.addedAt, dateError);
          }
      });
      // Sort by monthYear key
      return Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);


  // --- Calculations ---
  const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0), [filteredExpenses]);
  const budget = 85000; // Example budget - consider fetching from Firestore?
  const budgetRemaining = budget - totalExpenses;

  // Render loading state for charts specifically
  const chartsLoading = loading || (user?.role === 'Manager' && (employees.length === 0 || managerProjects.length === 0) && expenses.length > 0);

  return (
    <Layout user={user} onLogout={onLogout} title="Finance & Budgeting">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="glass-panel rounded-xl p-6 neon-border">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Total Expenses ({user?.role === 'Manager' ? 'Team' : user?.role !== 'Admin' ? 'My' : 'All'})</h3>
                  <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-4xl font-bold text-red-400">₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </motion.div>
            <motion.div
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="glass-panel rounded-xl p-6 neon-border">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-white">Budget Remaining</h3>
                 <TrendingUp className={`w-8 h-8 ${budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400'}`} />
               </div>
               <p className={`text-4xl font-bold ${budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                   ₱{budgetRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </p>
               <p className="text-xs text-gray-400 mt-1">Budget: ₱{budget.toLocaleString()}</p>
            </motion.div>
        </div>

          {/* Charts Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-xl p-6 neon-border"
          >
              <h3 className="text-xl font-bold neon-text mb-4">Expense Analysis</h3>
               {chartsLoading ? ( // Use combined loading state
                   <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
               ) : !filteredExpenses || filteredExpenses.length === 0 ? ( // Check filteredExpenses
                 <p className="text-gray-400 text-center py-10">No expense data available to display charts.</p>
               ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-72"> {/* Fixed height */}
                      {/* Pie Chart: Expenses by Category */}
                      <div>
                          <h4 className="text-sm font-semibold text-center mb-2 text-indigo-300">By Category</h4>
                          <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                  <Pie
                                      data={expenseByCategory}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                      nameKey="name"
                                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                          const RADIAN = Math.PI / 180;
                                          // Adjusted radius for better label placement with longer names
                                          const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                          return (
                                              <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px" className="pointer-events-none">
                                                  {`${expenseByCategory[index].name} (${(percent * 100).toFixed(0)}%)`}
                                              </text>
                                          );
                                      }}
                                  >
                                      {expenseByCategory.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip formatter={(value) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                  {/* Optional Legend if labels are too crowded */}
                                  {/* <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{fontSize: "10px"}} /> */}
                              </RechartsPieChart>
                          </ResponsiveContainer>
                      </div>

                      {/* Bar Chart: Expenses Over Time (Simple Example) */}
                      <div>
                          <h4 className="text-sm font-semibold text-center mb-2 text-indigo-300">Monthly Trend</h4>
                           <ResponsiveContainer width="100%" height="100%">
                              <RechartsBarChart data={expenseOverTime} margin={{ top: 20, right: 0, left: 10, bottom: 5 }}> {/* Increased top margin */}
                                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" strokeOpacity={0.3}/> {/* Darker grid */}
                                  <XAxis dataKey="name" fontSize="10px" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                                  <YAxis fontSize="10px" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} tickFormatter={(value) => `₱${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`} />
                                  <Tooltip
                                       formatter={(value) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                       cursor={{fill: 'rgba(99, 102, 241, 0.1)'}} // Use theme color
                                       contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '4px' }} // Themed tooltip
                                       labelStyle={{ color: '#cbd5e1' }} // Lighter label
                                  />
                                  <Bar dataKey="value" fill="url(#colorUv)"> {/* Use gradient */}
                                       <defs>
                                          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.3}/>
                                          </linearGradient>
                                        </defs>
                                       {/* Optional: Add labels on top */}
                                       <LabelList dataKey="value" position="top" fontSize="10px" fill="#9ca3af" formatter={(value) => `₱${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value.toFixed(0)}`} />
                                   </Bar>
                              </RechartsBarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
               )}
          </motion.div>


        {/* Expense List and Add Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold neon-text">Expenses Details</h2>
            {/* Add Expense Dialog Trigger */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Log Expense
                    </Button>
                </DialogTrigger>
                {/* Add Expense Dialog Content */}
                 <DialogContent className="bg-slate-900 border-indigo-500/30 text-white">
                     <DialogHeader>
                         <DialogTitle className="text-white">Log New Expense</DialogTitle>
                     </DialogHeader>
                     <div className="space-y-4 py-4">
                         <div><Label htmlFor="description" className="text-indigo-300">Description *</Label><Input id="description" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} className="bg-slate-800 border-indigo-500/30 text-white" placeholder="e.g., Office Supplies" required/></div>
                         <div><Label htmlFor="amount" className="text-indigo-300">Amount (₱) *</Label><Input id="amount" type="number" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} className="bg-slate-800 border-indigo-500/30 text-white" placeholder="e.g., 1500.50" min="0.01" step="0.01" required/></div>
                         <div><Label htmlFor="category" className="text-indigo-300">Category *</Label><select id="category" value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} className="w-full bg-slate-800 border border-indigo-500/30 rounded-md p-2 text-white h-10" required><option>Operations</option><option>Payroll</option><option>Equipment</option><option>Travel</option><option>Other</option></select></div>
                         <Button onClick={handleAddExpense} className="w-full bg-gradient-to-r from-yellow-600 to-amber-600">Log Expense</Button>
                     </div>
                 </DialogContent>
            </Dialog>
        </div>

        {/* Expense Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-xl p-0 md:p-4 neon-border overflow-hidden" // Remove padding for full-width table on mobile
        >
          {loading ? (
             <div className="flex justify-center items-center h-40">
               <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
               <p className="ml-3">Loading Expenses...</p>
             </div>
           ) : !filteredExpenses || filteredExpenses.length === 0 ? ( // Check filteredExpenses
             <div className="text-center p-6 md:py-10"> {/* Add padding for empty state */}
               <DollarSign className="w-16 h-16 mx-auto text-gray-500 mb-4" />
               <p className="text-lg text-gray-400">
                   {user?.role === 'Manager' ? 'No expenses found for your team.' : user?.role !== 'Admin' ? 'You have not logged any expenses.' : 'No expenses logged yet.'}
               </p>
               <p className="text-sm text-gray-500">Click "Log Expense" to add the first one.</p>
             </div>
           ) : (
               <div className="max-h-[60vh] overflow-y-auto scrollbar-hide"> {/* Increased max height */}
                   <Table>
                     <TableHeader className="sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10"> {/* Sticky Header */}
                       <TableRow className="border-b-indigo-500/30 hover:bg-transparent">
                         <TableHead className="text-indigo-300 px-3 py-2 md:px-4 md:py-3">Date</TableHead>
                         <TableHead className="text-indigo-300 px-3 py-2 md:px-4 md:py-3">Description</TableHead>
                         <TableHead className="text-indigo-300 px-3 py-2 md:px-4 md:py-3 hidden sm:table-cell">Category</TableHead> {/* Hide on small */}
                         {(user?.role === 'Admin' || user?.role === 'Manager') && <TableHead className="text-indigo-300 px-3 py-2 md:px-4 md:py-3 hidden md:table-cell">Logged By</TableHead>} {/* Hide on small/med */}
                         <TableHead className="text-right text-indigo-300 px-3 py-2 md:px-4 md:py-3">Amount</TableHead>
                         <TableHead className="w-[40px] md:w-[50px] text-indigo-300 px-2 py-2 md:px-4 md:py-3"></TableHead> {/* Action column */}
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {filteredExpenses.map((expense) => (
                         <TableRow key={expense.id} className="border-b-slate-700/50 hover:bg-slate-800/30">
                           <TableCell className="text-xs text-gray-400 px-3 py-2 md:px-4 md:py-3">
                               {expense.addedAt ? new Date(expense.addedAt).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric'}) : 'N/A'}
                           </TableCell>
                           <TableCell className="font-medium text-white max-w-[150px] sm:max-w-[200px] truncate px-3 py-2 md:px-4 md:py-3">{expense.description}</TableCell>
                           <TableCell className="text-gray-300 px-3 py-2 md:px-4 md:py-3 hidden sm:table-cell">{expense.category}</TableCell>
                           {/* Conditional Logged By Column */}
                           {(user?.role === 'Admin' || user?.role === 'Manager') && (
                             <TableCell className="text-xs text-gray-500 px-3 py-2 md:px-4 md:py-3 hidden md:table-cell truncate max-w-[100px]">{expense.addedBy}</TableCell>
                           )}
                           <TableCell className="text-right font-semibold text-red-400 px-3 py-2 md:px-4 md:py-3">
                               ₱{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </TableCell>
                           <TableCell className="text-right px-2 py-2 md:px-4 md:py-3">
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-6 w-6 md:h-7 md:w-7" // Smaller icon button
                                 onClick={() => handleDeleteExpense(expense.id)}
                                 aria-label="Delete expense"
                               >
                                 <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                               </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
               </div>
           )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default Finance;



