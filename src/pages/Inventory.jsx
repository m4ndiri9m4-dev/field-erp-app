import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, AlertTriangle, Trash2, Loader2 } from 'lucide-react'; // Added Trash2, Loader2
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

// --- Firestore Imports ---
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  updateDoc // Import updateDoc if you plan to edit items
} from 'firebase/firestore';


// --- Helper Function to Remove Undefined Fields ---
const cleanDataForFirestore = (data, isNew = false) => {
  const cleanedData = {};
  for (const key in data) {
    if (data[key] !== undefined) {
      cleanedData[key] = data[key];
    }
  }
  if (isNew) {
      delete cleanedData.id;
  }
  return cleanedData;
};


const Inventory = ({ user, onLogout, db, appId }) => { // Receive appId
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, reorderLevel: 10, location: '' });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Define the Firestore collection path
  const inventoryCollectionPath = `artifacts/${appId}/public/data/inventory`;

  // 1. Listen for inventory items
  useEffect(() => {
    if (!db || !appId) return;

    setLoading(true);
    const q = query(collection(db, inventoryCollectionPath));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsData = [];
      querySnapshot.forEach((doc) => {
        itemsData.push({ ...doc.data(), id: doc.id });
      });
      setItems(itemsData);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to inventory:", error);
      setLoading(false);
      toast({ title: "Error loading inventory", variant: "destructive"});
    });

    return () => unsubscribe();
  }, [db, appId, inventoryCollectionPath]); // Added collectionPath to dependencies

  // 2. Add item
  const handleAddItem = async () => {
    if (!newItem.name) {
      toast({ title: "Name Required", variant: "destructive" });
      return;
    }

    const item = {
      ...newItem,
      quantity: Number(newItem.quantity) || 0,
      reorderLevel: Number(newItem.reorderLevel) || 10,
      addedBy: user?.email || 'Unknown', // Use optional chaining
      addedAt: new Date().toISOString()
    };

    // Clean data before saving
    const cleanedItem = cleanDataForFirestore(item, true); // true for new item

    try {
      await addDoc(collection(db, inventoryCollectionPath), cleanedItem); // Use cleaned data
      setNewItem({ name: '', quantity: 0, reorderLevel: 10, location: '' });
      setIsOpen(false);
      toast({ title: "Item Added! 📦" });
    } catch (error) {
      console.error("Error adding item: ", error);
      toast({ title: "Error Adding Item", description: error.message, variant: "destructive" });
    }
  };

  // 3. Delete item
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, inventoryCollectionPath, itemId));
      toast({ title: "Item Deleted 🗑️", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting item: ", error);
      toast({ title: "Error Deleting Item", description: error.message, variant: "destructive" });
    }
  };

   // Optional: Add Edit Functionality (requires an Edit Modal similar to Add)
   /*
   const handleEditItem = async (itemData) => {
       if (!itemData.id) return; // Need an ID to update
       const cleanedData = cleanDataForFirestore(itemData); // false (or omit) for update
       try {
           const itemRef = doc(db, inventoryCollectionPath, itemData.id);
           await updateDoc(itemRef, cleanedData);
           toast({ title: "Item Updated! ✨" });
           // Close edit modal here
       } catch (error) {
           console.error("Error updating item:", error);
           toast({ title: "Error Updating Item", description: error.message, variant: "destructive" });
       }
   };
   */

  return (
    <Layout user={user} onLogout={onLogout} title="Inventory & Assets">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold neon-text">Inventory</h2>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-indigo-500/30 text-white"> {/* Added text-white */}
              <DialogHeader>
                <DialogTitle className="text-white">Add Inventory Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4"> {/* Added py-4 */}
                <div>
                  <Label htmlFor="name" className="text-indigo-300">Item Name</Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="bg-slate-800 border-indigo-500/30 text-white" /* Added text-white */
                    placeholder="e.g., Safety Helmet"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity" className="text-indigo-300">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0" // Prevent negative numbers
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value, 10) || 0})} // Ensure base 10 and default to 0
                    className="bg-slate-800 border-indigo-500/30 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="reorder" className="text-indigo-300">Reorder Level</Label>
                  <Input
                    id="reorder"
                    type="number"
                    min="0"
                    value={newItem.reorderLevel}
                    onChange={(e) => setNewItem({...newItem, reorderLevel: parseInt(e.target.value, 10) || 0})}
                    className="bg-slate-800 border-indigo-500/30 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="text-indigo-300">Location</Label>
                  <Input
                    id="location"
                    value={newItem.location}
                    onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                    className="bg-slate-800 border-indigo-500/30 text-white"
                     placeholder="e.g., Warehouse A, Shelf 3"
                  />
                </div>
                <Button onClick={handleAddItem} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                  Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            <p className="ml-4">Loading Inventory...</p>
          </div>
        )}

        {!loading && items.length === 0 && (
            <div className="text-center py-10 glass-panel rounded-xl neon-border">
                <Package className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                <p className="text-lg text-gray-400">Inventory is empty.</p>
                <p className="text-sm text-gray-500">Click "Add Item" to get started.</p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!loading && items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`glass-panel rounded-xl p-6 neon-border relative ${
                item.quantity <= item.reorderLevel ? 'border-red-500 ring-2 ring-red-500/50' : '' // Enhanced low stock indicator
              }`}
            >
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="absolute top-3 right-3 p-1 text-red-500 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full"
                aria-label="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {/* Optional: Add Edit Button
               <button
                 onClick={() => { /* Set editing item state and open edit modal * / }}
                 className="absolute top-3 right-10 p-1 text-yellow-500 hover:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-full"
                 aria-label="Edit item"
               >
                 <Edit className="w-4 h-4" />
               </button>
              */}

              <div className="flex items-start justify-between mb-4">
                <Package className="w-8 h-8 text-emerald-400" />
                {item.quantity <= item.reorderLevel && (
                  <div className="flex items-center text-red-400">
                    <AlertTriangle className="w-5 h-5 mr-1 animate-pulse" />
                    <span className="text-xs font-semibold">Low Stock</span>
                   </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2 truncate">{item.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Quantity:</span>
                  <span className={`font-bold ${
                    item.quantity <= item.reorderLevel ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {item.quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reorder Level:</span>
                  <span className="text-yellow-400">{item.reorderLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Location:</span>
                  <span className="text-indigo-400 truncate">{item.location || 'N/A'}</span>
                </div>
                 {item.addedAt && (
                   <p className="text-xs text-gray-500 pt-2 border-t border-slate-700/50 mt-2">
                     Added by {item.addedBy} on {new Date(item.addedAt).toLocaleDateString()}
                   </p>
                 )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Inventory;

