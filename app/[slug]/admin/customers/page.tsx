"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "../../../../lib/firebase/config";
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  addDoc, 
  orderBy, 
  deleteDoc, 
  getDocs,
  where,
  Timestamp 
} from "firebase/firestore";
import { Customer, DueTransaction } from "../../../../types/models";
import AdminSidebar from "../../../../components/AdminSidebar";
import { 
  Search, 
  Phone, 
  Home, 
  User, 
  IndianRupee, 
  ArrowLeft, 
  Users, 
  Wallet, 
  Trash2, 
  Plus, 
  Minus, 
  Clock, 
  FileText,
  ChevronRight,
  Filter,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "../../../../lib/utils";

export default function CustomersAdmin() {
  const { slug } = useParams<{ slug: string }>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Khatabook Flow States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<DueTransaction[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState<'gave' | 'got' | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    mobile: "",
    address: ""
  });

  const handleAddCustomer = async () => {
    if (!slug || !newCustomerData.name || !newCustomerData.mobile) return;
    setIsProcessing(true);
    try {
      const customerData = {
        name: newCustomerData.name,
        mobile: newCustomerData.mobile,
        address: newCustomerData.address,
        dueAmount: 0,
        verified: true,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "restaurants", slug, "customers"), customerData);
      
      setNewCustomerData({ name: "", mobile: "", address: "" });
      setIsAddingCustomer(false);
    } catch (e) {
      console.error("Add customer error:", e);
      alert("Failed to add customer.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 1. Fetch all customers
  useEffect(() => {
    if (!slug) return;
    const q = query(collection(db, "restaurants", slug, "customers"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[];
      setCustomers(data);
      setLoading(false);
    });
    return () => unsub();
  }, [slug]);

  // 2. Fetch transactions for selected customer
  useEffect(() => {
    if (!slug || !selectedCustomer?.id) {
      setTransactions([]);
      return;
    }

    const q = query(
      collection(db, "restaurants", slug, "customers", selectedCustomer.id, "transactions"),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as DueTransaction[];
      setTransactions(data);
    });

    return () => unsub();
  }, [slug, selectedCustomer]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.mobile.includes(searchQuery)
  );

  const totalGave = customers.reduce((acc, curr) => acc + (curr.dueAmount || 0), 0);

  // 3. Handle adding transaction (gave/got)
  const handleAddTransaction = async () => {
    if (!slug || !selectedCustomer?.id || !amount) return;
    setIsProcessing(true);

    try {
      const numAmount = parseFloat(amount);
      const type = showTransactionModal!;
      
      // Add transaction record
      await addDoc(collection(db, "restaurants", slug, "customers", selectedCustomer.id, "transactions"), {
        amount: numAmount,
        type,
        note,
        timestamp: serverTimestamp(),
        customerId: selectedCustomer.id
      });

      // Update customer total dueAmount
      const currentDue = selectedCustomer.dueAmount || 0;
      const newDue = type === 'gave' ? currentDue + numAmount : currentDue - numAmount;

      await updateDoc(doc(db, "restaurants", slug, "customers", selectedCustomer.id), {
        dueAmount: Math.max(0, newDue),
        lastUpdated: serverTimestamp()
      });

      // Reset states
      setAmount("");
      setNote("");
      setShowTransactionModal(null);
      // Update local selected customer to reflect new balance
      setSelectedCustomer({ ...selectedCustomer, dueAmount: Math.max(0, newDue) });
    } catch (e) {
      console.error("Transaction error:", e);
      alert("Failed to record transaction.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Delete individual transaction
  const handleDeleteTransaction = async (tx: DueTransaction) => {
    if (!slug || !selectedCustomer?.id || !tx.id || !confirm("Delete this transaction? This will also revert the balance.")) return;

    try {
      // Revert the balance first
      const currentDue = selectedCustomer.dueAmount || 0;
      const revertedDue = tx.type === 'gave' ? currentDue - tx.amount : currentDue + tx.amount;

      await updateDoc(doc(db, "restaurants", slug, "customers", selectedCustomer.id), {
        dueAmount: Math.max(0, revertedDue),
        lastUpdated: serverTimestamp()
      });

      // Delete the transaction record
      await deleteDoc(doc(db, "restaurants", slug, "customers", selectedCustomer.id, "transactions", tx.id));
      
      setSelectedCustomer({ ...selectedCustomer, dueAmount: Math.max(0, revertedDue) });
    } catch (e) {
      console.error("Delete transaction error:", e);
      alert("Failed to delete transaction.");
    }
  };

  // 5. Delete entire customer due (Reset to zero)
  const handleResetCustomerDue = async () => {
    if (!slug || !selectedCustomer?.id || !confirm("Clear all dues for this customer? This will reset balance to 0.")) return;

    try {
      // 1. Reset balance
      await updateDoc(doc(db, "restaurants", slug, "customers", selectedCustomer.id), {
        dueAmount: 0,
        lastUpdated: serverTimestamp()
      });

      // 2. Clear all transaction records (optional, but cleaner for a 'reset')
      const txs = await getDocs(collection(db, "restaurants", slug, "customers", selectedCustomer.id, "transactions"));
      const deletePromises = txs.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      setSelectedCustomer({ ...selectedCustomer, dueAmount: 0 });
      alert("Dues cleared successfully.");
    } catch (e) {
      console.error("Reset due error:", e);
      alert("Failed to clear dues.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F0F2F5]">
      <AdminSidebar activeTab="customers" />
      
      <main className="flex-1 transition-all duration-500 flex flex-col h-screen">
        <div className="max-w-7xl mx-auto w-full flex flex-col h-full p-4 md:p-8">
          
          <AnimatePresence mode="wait">
            {!selectedCustomer ? (
              /* --- CUSTOMER LIST VIEW (KHATABOOK STYLE) --- */
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col h-full"
              >
                {/* Top Summary Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 flex justify-between items-center border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Balance</p>
                      <p className="text-2xl font-black text-red-600">{formatPrice(totalGave)} <span className="text-[10px] text-gray-400 uppercase tracking-widest ml-1 font-bold">You will get</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsAddingCustomer(true)}
                      className="p-3 bg-orange-600 rounded-xl text-white hover:bg-orange-700 transition-all border border-transparent shadow-lg shadow-orange-600/20 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                      title="Add New Customer"
                    >
                      <Plus size={18} /> ADD NEW
                    </button>
                    <button 
                      className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:bg-orange-50 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100"
                      title="Filter List"
                    >
                      <Filter size={20} />
                    </button>
                    <button 
                      className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:bg-orange-50 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100"
                      title="Export Statement"
                    >
                      <FileText size={20} />
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input 
                    type="text"
                    placeholder="Search Customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border-none rounded-2xl py-5 pl-16 pr-6 text-sm font-bold shadow-sm focus:ring-2 focus:ring-orange-600/10 transition-all"
                  />
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto bg-white rounded-3xl shadow-sm border border-gray-100 custom-scrollbar">
                  {loading ? (
                    <div className="p-20 text-center text-gray-300">Establishing secure link...</div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center">
                      <Users size={48} className="text-gray-100 mb-4" />
                      <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No customers found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {filteredCustomers.map(customer => (
                        <button 
                          key={customer.id}
                          onClick={() => setSelectedCustomer(customer)}
                          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all group"
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors font-black text-lg">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{customer.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">{customer.mobile}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className={`font-black text-lg ${ (customer.dueAmount || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {formatPrice(customer.dueAmount || 0)}
                              </p>
                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                {(customer.dueAmount || 0) > 0 ? 'You will get' : 'Settled'}
                              </p>
                            </div>
                            <button 
                              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                              title="View Customer Details"
                            >
                              <ChevronRight size={20} className="text-gray-300 group-hover:text-orange-600 transition-all" />
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* --- CUSTOMER TRANSACTION VIEW (KHATABOOK STYLE) --- */
              <motion.div 
                key="transactions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                {/* Header with Back Button */}
                <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedCustomer(null)}
                      className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-all"
                      title="Go Back to List"
                    >
                      <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-black">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 uppercase tracking-tight text-sm leading-none">{selectedCustomer.name}</p>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">View Details</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all border border-transparent"
                      title="Call Customer"
                    >
                      <Phone size={18} />
                    </button>
                    <button 
                      onClick={handleResetCustomerDue}
                      className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100"
                      title="Clear All Dues"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Balance Summary Bar */}
                <div className="grid grid-cols-2 gap-px bg-gray-100 rounded-3xl overflow-hidden shadow-sm mb-6 border border-gray-100">
                  <div className="bg-white p-6 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Balance</p>
                    <p className={`text-2xl font-black ${ (selectedCustomer.dueAmount || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatPrice(selectedCustomer.dueAmount || 0)}
                    </p>
                  </div>
                  <button 
                    className="bg-white p-6 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
                    title="View Statement"
                  >
                    <FileText size={20} className="text-orange-600" />
                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Statement</span>
                  </button>
                </div>

                {/* Transaction History */}
                <div className="flex-1 overflow-y-auto bg-white rounded-t-[3rem] shadow-sm border border-gray-100 custom-scrollbar flex flex-col p-6">
                  <div className="flex-1">
                    {transactions.length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center justify-center h-full">
                        <Clock size={40} className="text-gray-100 mb-4" />
                        <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">No transaction history</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {transactions.map((tx) => (
                          <div key={tx.id} className="flex flex-col">
                            <div className="flex justify-center mb-4">
                              <span className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase px-4 py-1.5 rounded-full tracking-widest">
                                {tx.timestamp?.toDate().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <div className={`flex ${tx.type === 'gave' ? 'justify-end' : 'justify-start'} group`}>
                              <div className={`max-w-[80%] rounded-3xl p-5 shadow-sm border relative overflow-hidden ${
                                tx.type === 'gave' 
                                  ? 'bg-red-50 border-red-100' 
                                  : 'bg-emerald-50 border-emerald-100'
                              }`}>
                                <button 
                                  onClick={() => handleDeleteTransaction(tx)}
                                  className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete Transaction"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <div className="flex items-start justify-between gap-10 mb-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                                    {tx.type === 'gave' ? 'YOU GAVE' : 'YOU GOT'}
                                  </p>
                                  <p className="text-[9px] font-bold text-gray-400 italic">
                                    {tx.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <p className={`text-xl font-black ${tx.type === 'gave' ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {formatPrice(tx.amount)}
                                </p>
                                {tx.note && (
                                  <p className="text-xs font-bold text-gray-600 mt-2 italic leading-relaxed">"{tx.note}"</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar (Khatabook Style) */}
                <div className="bg-white p-6 border-t border-gray-100 rounded-b-3xl shadow-lg flex gap-4">
                  <button 
                    onClick={() => setShowTransactionModal('gave')}
                    className="flex-1 bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                    title="Add Due (Lene)"
                  >
                    <Plus size={18} /> YOU GAVE
                  </button>
                  <button 
                    onClick={() => setShowTransactionModal('got')}
                    className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                    title="Add Payment (Dene)"
                  >
                    <Minus size={18} /> YOU GOT
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Customer Modal */}
        <AnimatePresence>
          {isAddingCustomer && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-100 flex items-center justify-center p-6">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white">
                    <Plus size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">New Customer</h2>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Create Ledger Account</p>
                  </div>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text"
                      value={newCustomerData.name}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                      placeholder="Enter customer name"
                      className="w-full bg-gray-50 border-none rounded-2xl py-5 px-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                    <input 
                      type="tel"
                      value={newCustomerData.mobile}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, mobile: e.target.value })}
                      placeholder="Enter phone number"
                      className="w-full bg-gray-50 border-none rounded-2xl py-5 px-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Address</label>
                    <input 
                      type="text"
                      value={newCustomerData.address}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                      placeholder="Enter customer address"
                      className="w-full bg-gray-50 border-none rounded-2xl py-5 px-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/10 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setIsAddingCustomer(false);
                      setNewCustomerData({ name: "", mobile: "", address: "" });
                    }}
                    className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleAddCustomer}
                    disabled={!newCustomerData.name || !newCustomerData.mobile || isProcessing}
                    className="flex-2 py-5 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? 'CREATING...' : 'CREATE ACCOUNT'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Transaction Entry Modal */}
        <AnimatePresence>
          {showTransactionModal && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-100 flex items-center justify-center p-6">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${showTransactionModal === 'gave' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {showTransactionModal === 'gave' ? <Plus size={28} /> : <Minus size={28} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                      {showTransactionModal === 'gave' ? 'Record Sale' : 'Record Payment'}
                    </h2>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{selectedCustomer?.name}</p>
                  </div>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                      <input 
                        autoFocus
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-gray-50 border-none rounded-2xl py-6 pl-14 pr-6 text-3xl font-black text-gray-900 focus:ring-2 focus:ring-orange-600/10 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Note (Optional)</label>
                    <input 
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Chai and Samosa"
                      className="w-full bg-gray-50 border-none rounded-2xl py-5 px-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600/10 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setShowTransactionModal(null);
                      setAmount("");
                      setNote("");
                    }}
                    className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleAddTransaction}
                    disabled={!amount || isProcessing}
                    className={`flex-2 py-5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 ${
                      showTransactionModal === 'gave' ? 'bg-red-600 shadow-red-600/20' : 'bg-emerald-600 shadow-emerald-600/20'
                    }`}
                  >
                    {isProcessing ? 'PROCESSING...' : 'SAVE ENTRY'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
