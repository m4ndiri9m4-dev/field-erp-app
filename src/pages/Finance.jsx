import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Plus, TrendingUp, TrendingDown, Trash2, Loader2, PieChart, BarChart } from 'lucide-react'; // Added chart icons
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added Tabs
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
  const [projects, setProjects] = useState([]); // Needed for manager filtering
  const [managerProjects, setManagerProjects] = useState([]); // Store manager's project IDs

  // --- Firestore Logic ---
  const expensesCollectionPath = `artifacts/${appId}/public/data/expenses`;
  const employeesCollectionPath = `artifacts/${appId}/public/data/employees`;
  const projectsCollectionPath = `artifacts/${appId}/public/data/projects`;


  // Fetch employees and projects (needed for manager filtering)
  useEffect(() => {
     if (!db || !appId || user?.role !== 'Manager') return; // Only needed for managers

     let unsubEmployees = () => {};
     let unsubProjects = () => {};

      // Fetch employees to link expense 'addedBy' email to employee project assignments
     const empQuery = query(collection(db, employeesCollectionPath));
     unsubEmployees = onSnapshot(empQuery, (snapshot) => {
         setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
     }, (error) => console.error("Error fetching employees for manager filter:", error));

     // Fetch projects to find which ones the manager oversees
     // --- THIS IS A PLACEHOLDER - Requires 'managerEmail' or similar field on projects ---
     const projQuery = query(collection(db, projectsCollectionPath), where("managerEmail", "==", user.email)); // Assuming 'managerEmail' field
     unsubProjects = onSnapshot(projQuery, (snapshot) => {
         setManagerProjects(snapshot.docs.map(doc => doc.id)); // Store IDs of projects managed by this user
     }, (error) => console.error("Error fetching manager projects:", error));


     return () => {
         unsubEmployees();
         unsubProjects();
     };
  }, [db, appId, user]);


  // Listen for expenses
  useEffect(() => {
    if (!db || !appId) {
        setLoading(false);
        return;
    }

    setLoading(true);
    // No initial filtering here, filter happens in useMemo based on role
    const q = query(collection(db, expensesCollectionPath));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expensesData.push({ ...data, id: doc.id, amount: Number(data.amount) || 0 });
      });
       // Sort by date descending
       expensesData.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
      setExpenses(expensesData);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to expenses:", error);
      setLoading(false);
      toast({ title: "Error loading expenses", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [db, appId, expensesCollectionPath]);


  // Filter expenses based on user role (using useMemo for efficiency)
  const filteredExpenses = useMemo(() => {
      if (loading) return []; // Return empty while loading dependencies
      if (user?.role === 'Admin') {
          return expenses; // Admin sees all
      }
      if (user?.role === 'Manager') {
           if (employees.length === 0 || managerProjects.length === 0) return []; // Wait for employee/project data

           // Find emails of employees assigned to the manager's projects
           const managedEmployeeEmails = employees
               .filter(emp => emp.projectId && managerProjects.includes(emp.projectId))
               .map(emp => emp.email)
               .filter(email => !!email); // Remove any undefined/null emails

           // Filter expenses where 'addedBy' matches one of the managed employees
           return expenses.filter(exp => managedEmployeeEmails.includes(exp.addedBy));
      }
      // Field Employee or other roles see only their own logged expenses
      return expenses.filter(exp => exp.addedBy === user?.email);

  }, [expenses, user, employees, managerProjects, loading]);


  // --- CRUD Operations --- (Keep existing Add/Delete logic)

  const handleAddExpense = async () => {
    // ... (keep existing validation and add logic) ...
     const amountAsNumber = parseFloat(newExpense.amount);
     if (!newExpense.description || isNaN(amountAsNumber) || amountAsNumber <= 0) {
       toast({ title: "Invalid Input", description: "Please enter description and a valid positive amount", variant: "destructive" });
       return;
     }
     const expense = {
       ...newExpense,
       amount: amountAsNumber,
       addedBy: user?.email || 'Unknown',
       addedAt: new Date().toISOString()
     };
     const cleanedExpense = cleanDataForFirestore(expense, true);
     try {
       await addDoc(collection(db, expensesCollectionPath), cleanedExpense);
       setNewExpense({ description: '', amount: '', category: 'Operations' });
       setIsOpen(false);
       toast({ title: "Expense Logged! 💰" });
     } catch (error) {
       console.error("Error adding expense:", error);
       toast({ title: "Error Adding Expense", description: error.message, variant: "destructive" });
     }
  };

  const handleDeleteExpense = async (expenseId) => {
    // ... (keep existing delete logic) ...
      if (!window.confirm("Are you sure you want to delete this expense?")) return;
      try {
        await deleteDoc(doc(db, expensesCollectionPath, expenseId));
        toast({ title: "Expense Deleted 🗑️", variant: "destructive" });
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

  // Example: Expenses over time (by month) - more complex date logic needed for real app
  const expenseOverTime = useMemo(() => {
     const monthMap = {};
     filteredExpenses.forEach(exp => {
         const date = new Date(exp.addedAt || Date.now());
         const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Format YYYY-MM
         monthMap[monthYear] = (monthMap[monthYear] || 0) + exp.amount;
     });
      // Sort by monthYear key
      return Object.entries(monthMap)
         .sort(([a], [b]) => a.localeCompare(b))
         .map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);


  // --- Calculations ---
  const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0), [filteredExpenses]);
  const budget = 85000; // Example
  const budgetRemaining = budget - totalExpenses;

  return (
    <Layout user={user} onLogout={onLogout} title="Finance & Budgeting">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ... (keep existing stat cards) ... */}
           <motion.div /* Total Expenses */ className="glass-panel rounded-xl p-6 neon-border">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-white">Total Expenses ({user?.role === 'Manager' ? 'Team' : user?.role !== 'Admin' ? 'My' : 'All'})</h3>
                 <TrendingDown className="w-8 h-8 text-red-400" />
               </div>
               <p className="text-4xl font-bold text-red-400">₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
           </motion.div>
           <motion.div /* Budget Remaining */ className="glass-panel rounded-xl p-6 neon-border">
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
              {loading ? (
                   <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
              ) : filteredExpenses.length === 0 ? (
                  <p className="text-gray-400 text-center py-10">No expense data to display charts.</p>
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
                                         const radius = innerRadius + (outerRadius - innerRadius) * 1.1; // Label position
                                         const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                         const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                         return (
                                             <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
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
                             </RechartsPieChart>
                         </ResponsiveContainer>
                     </div>

                     {/* Bar Chart: Expenses Over Time (Simple Example) */}
                     <div>
                         <h4 className="text-sm font-semibold text-center mb-2 text-indigo-300">Monthly Trend</h4>
                          <ResponsiveContainer width="100%" height="100%">
                             <RechartsBarChart data={expenseOverTime} margin={{ top: 5, right: 0, left: 10, bottom: 5 }}>
                                 <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                 <XAxis dataKey="name" fontSize="10px" stroke="#9ca3af" />
                                 <YAxis fontSize="10px" stroke="#9ca3af" tickFormatter={(value) => `₱${value/1000}k`} />
                                 <Tooltip formatter={(value) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} cursor={{fill: 'rgba(110, 118, 147, 0.1)'}}/>
                                 <Bar dataKey="value" fill="#8884d8">
                                     {/* Optional: Add labels inside bars */}
                                      {/* <LabelList dataKey="value" position="top" fontSize="10px" formatter={(value) => `₱${(value/1000).toFixed(1)}k`} /> */}
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
           {/* Keep Add Expense Dialog Trigger */}
           <Dialog open={isOpen} onOpenChange={setIsOpen}>
               <DialogTrigger asChild>
                   <Button className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700">
                       <Plus className="w-4 h-4 mr-2" />
                       Log Expense
                   </Button>
               </DialogTrigger>
                {/* Keep Add Expense Dialog Content */}
                <DialogContent className="bg-slate-900 border-indigo-500/30 text-white">
                   {/* ... (Dialog content remains the same) ... */}
                    <DialogHeader>
                        <DialogTitle className="text-white">Log New Expense</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div><Label htmlFor="description" className="text-indigo-300">Description</Label><Input id="description" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} className="bg-slate-800 border-indigo-500/30 text-white" placeholder="e.g., Office Supplies"/></div>
                        <div><Label htmlFor="amount" className="text-indigo-300">Amount (₱)</Label><Input id="amount" type="number" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} className="bg-slate-800 border-indigo-500/30 text-white" placeholder="e.g., 1500.50" min="0.01" step="0.01"/></div>
                        <div><Label htmlFor="category" className="text-indigo-300">Category</Label><select id="category" value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} className="w-full bg-slate-800 border border-indigo-500/30 rounded-md p-2 text-white"><option>Operations</option><option>Payroll</option><option>Equipment</option><option>Travel</option><option>Other</option></select></div>
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
            className="glass-panel rounded-xl p-4 neon-border" // Less padding for table
        >
          {loading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="ml-3">Loading Expenses...</p>
            </div>
           ) : filteredExpenses.length === 0 ? (
             <div className="text-center py-10">
                 <DollarSign className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                 <p className="text-lg text-gray-400">
                    {user?.role === 'Manager' ? 'No expenses found for your team.' : user?.role !== 'Admin' ? 'You have not logged any expenses.' : 'No expenses logged yet.'}
                 </p>
                 <p className="text-sm text-gray-500">Click "Log Expense" to add the first one.</p>
             </div>
           ) : (
                <div className="max-h-96 overflow-y-auto scrollbar-hide"> {/* Scrollable container */}
                   <Table>
                     <TableHeader>
                       <TableRow className="border-b-indigo-500/30 hover:bg-transparent">
                         <TableHead className="text-indigo-300">Date</TableHead>
                         <TableHead className="text-indigo-300">Description</TableHead>
                         <TableHead className="text-indigo-300">Category</TableHead>
                         {user?.role === 'Admin' && <TableHead className="text-indigo-300">Logged By</TableHead>} {/* Admin only */}
                         {user?.role === 'Manager' && <TableHead className="text-indigo-300">Logged By</TableHead>} {/* Manager maybe */}
                         <TableHead className="text-right text-indigo-300">Amount</TableHead>
                         <TableHead className="w-[50px] text-indigo-300"></TableHead> {/* Action column */}
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {filteredExpenses.map((expense) => (
                         <TableRow key={expense.id} className="border-b-slate-700/50">
                           <TableCell className="text-xs text-gray-400">
                                {expense.addedAt ? new Date(expense.addedAt).toLocaleDateString() : 'N/A'}
                           </TableCell>
                           <TableCell className="font-medium text-white max-w-[200px] truncate">{expense.description}</TableCell>
                           <TableCell className="text-gray-300">{expense.category}</TableCell>
                            {/* Conditional Logged By Column */}
                            {user?.role === 'Admin' && <TableCell className="text-xs text-gray-500">{expense.addedBy}</TableCell>}
                            {user?.role === 'Manager' && <TableCell className="text-xs text-gray-500">{expense.addedBy}</TableCell>}
                           <TableCell className="text-right font-semibold text-red-400">
                               ₱{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </TableCell>
                           <TableCell className="text-right">
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="text-red-500 hover:bg-red-500/10 h-6 w-6"
                                 onClick={() => handleDeleteExpense(expense.id)}
                                 aria-label="Delete expense"
                               >
                                 <Trash2 className="w-4 h-4" />
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

