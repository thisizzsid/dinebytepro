"use client";


import { useEffect, useState } from "react";
import { db, auth, googleProvider } from "../../../lib/firebase/config";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, where, limit, addDoc, deleteDoc, setDoc, getDocs, getDoc, DocumentData, QueryDocumentSnapshot, serverTimestamp } from "firebase/firestore";
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut, signInWithPopup } from "firebase/auth";
import { Order } from "../../../types/models";
import { formatPrice } from "../../../lib/utils";
import { 
  Bell, 
  ChefHat, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  Search, 
  LayoutGrid, 
  List, 
  Table as TableIcon,
  Phone,
  User,
  Calendar,
  IndianRupee,
  Activity,
  Navigation,
  ArrowUpRight,
  Loader2,
  Lock,
  ArrowRight,
  AlertCircle,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Check,
  Save,
  Volume2,
  Timer,
  Utensils,
  Minus,
  X,
  ShieldAlert,
  BrainCircuit
} from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { notificationManager } from "../../../lib/notification-manager";
import { OrderItem } from "../../../types";
import { useRouter, useParams } from "next/navigation";
import { useRestaurant } from "../../../lib/restaurant-context";
import DarkToggle from "@/components/DarkToggle";
import MenuItemModal from "@/components/MenuItemModal";
import { motion, AnimatePresence } from "framer-motion";
import { getBusinessInsights } from "../../../lib/gemini";
import { Sparkles as SparklesIcon, Lightbulb, TrendingUp } from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";

export default function AdminPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant, isLoading: isRestroLoading } = useRestaurant();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'live' | 'completed' | 'menu' | 'settings' | 'history' | 'inventory'>('dashboard');

  // Sync state with URL query parameter
  useEffect(() => {
    const handleLocationChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get('tab') as any;
      if (tab && ['dashboard', 'live', 'completed', 'menu', 'settings', 'history', 'inventory'].includes(tab)) {
        setActiveTab(tab);
      } else {
        setActiveTab('dashboard');
      }
    };

    handleLocationChange();
    
    // Listen for state changes
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Update URL when tab changes internally
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any);
    const newUrl = `${window.location.pathname}?tab=${tab}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  // Menu Management State
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [newItem, setNewItem] = useState({ 
    name: "", 
    description: "", 
    price: 0, 
    category: "Main Course (Veg)",
    type: "veg" as "veg" | "non-veg" | "egg",
    ingredients: [] as any[]
  });
  
  // Settings State
  const [upiId, setUpiId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [notifSettings, setNotifSettings] = useState({ volume: 1.0, enabled: true });

  // AutoBot State
  const [autoBotEnabled, setAutoBotEnabled] = useState(false);
  const [autoBotDelay, setAutoBotDelay] = useState({ prepare: 5, ready: 15 });
  const [addItemError, setAddItemError] = useState("");
  const [addItemSuccess, setAddItemSuccess] = useState("");
  const [editItemError, setEditItemError] = useState("");

  // AI Insights State
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Inventory State
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isAddingInventory, setIsAddingInventory] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState({
    name: "",
    quantity: 0,
    unit: "kg",
    lowStockThreshold: 1,
    category: "Vegetables"
  });

  const fetchAiInsights = async () => {
    if (!restaurant || orders.length === 0) return;
    setIsAiLoading(true);
    
    // Calculate basic stats for AI
    const orderDate = (o: Order) => o.createdAt && typeof (o.createdAt as any).toDate === 'function' 
      ? (o.createdAt as any).toDate() 
      : (o.createdAt as any) instanceof Date ? o.createdAt : new Date();
    
    const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
    
    const todayOrders = orders.filter(o => isToday(orderDate(o)));
    const revenueToday = todayOrders.reduce((sum, o) => sum + (o.orderStatus === 'delivered' ? o.totalAmount : 0), 0);
    
    // Get popular items (simple logic)
    const itemCounts: Record<string, number> = {};
    todayOrders.forEach(o => {
      o.items.forEach(i => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
      });
    });
    const popularItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);

    const insights = await getBusinessInsights({
      name: restaurant.name,
      ordersToday: todayOrders.length,
      revenueToday: formatPrice(revenueToday),
      popularItems: popularItems.length > 0 ? popularItems : ["No orders yet today"]
    });
    
    setAiInsights(insights);
    setIsAiLoading(false);
  };

  useEffect(() => {
    // make sure previous restaurant data doesn't linger when slug changes
    setOrders([]);
    setMenuItems([]);
    // reset auth flag; it'll be recalculated below
    setIsAdminAuthenticated(false);
  }, [slug]);

  useEffect(() => {
    if (notificationManager) {
      setNotifSettings(notificationManager.getSettings());
    }
  }, []);

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isRestroLoading && !restaurant) {
      router.push("/onboarding");
    }
  }, [restaurant, isRestroLoading, router]);

  useEffect(() => {
    const isAuth = slug && sessionStorage.getItem(`dinebyte_auth_${slug}`) === "true";
    setIsAdminAuthenticated(!!isAuth);

    const cleanupOldOrders = async () => {
      if (!slug) return;
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const q = query(
        collection(db, "restaurants", slug as string, "orders"), 
        where("createdAt", "<", fortyEightHoursAgo)
      );
      
      try {
        const snapshot = await getDocs(q);
        if (snapshot.docs.length > 0) {
          const deletePromises = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => deleteDoc(d.ref));
          await Promise.all(deletePromises);
        }
      } catch (e) {
        console.error("Cleanup Error:", e);
      }
    };

    if (isAuth) {
      cleanupOldOrders();
    }

    if (!slug) return;

    const q = query(collection(db, "restaurants", slug as string, "orders"), orderBy("createdAt", "desc"), limit(100));
    let isInitialLoad = true;
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      if (!isInitialLoad && snapshot.docChanges().some(change => change.type === "added")) {
        notificationManager?.playNewOrder();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("DineByte", {
            body: "New order received!",
            icon: "/moclogo.png"
          });
        }
      }

      if (!isInitialLoad) {
        snapshot.docChanges().forEach(change => {
          if (change.type === "modified") {
            const newData = change.doc.data() as any;
            const oldOrder = orders.find(o => o.id === change.doc.id);
            if (newData.lastPingAt && (!oldOrder?.lastPingAt || newData.lastPingAt.toMillis() > (oldOrder.lastPingAt as any).toMillis())) {
              notificationManager?.playCustomerPing();
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Customer Ping!", {
                  body: `${newData.customerName} (Table ${newData.tableNumber || 'Takeaway'}) is calling!`,
                  icon: "/moclogo.png"
                });
              }
            }
          }
        });
      }
      isInitialLoad = false;
      
      setOrders(ordersData);
      setLoading(false);
    });

    const menuQ = query(collection(db, "restaurants", slug as string, "menu"), orderBy("category"));
    const unsubscribeMenu = onSnapshot(menuQ, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenuItems(menuData);
    });

    const settingsUnsub = onSnapshot(doc(db, "restaurants", slug as string, "settings", "config"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUpiId(data.upiId || "");
        setCurrency(data.currency || "INR");
        setTimezone(data.timezone || "Asia/Kolkata");
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
      settingsUnsub();
    };
  }, [slug]);

  useEffect(() => {
    if (!slug || activeTab !== 'inventory') return;

    const inventoryQ = query(collection(db, "restaurants", slug as string, "inventory"), orderBy("name"));
    const unsubscribeInventory = onSnapshot(inventoryQ, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInventoryItems(inventoryData);
    });

    return () => unsubscribeInventory();
  }, [slug, activeTab]);

  const categories = [
    "Chai Specials",
    "Starters",
    "Main Course (Veg)",
    "Main Course (Non-Veg)",
    "Breads",
    "Rice & Biryani",
    "Desserts",
    "Beverages",
    "Fast Food"
  ];

  const handleGoogleAdminLogin = async () => {
    if (!restaurant) return;
    setAuthError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const restroRef = doc(db, "restaurants", slug as string);
      const restroSnap = await getDoc(restroRef);
      if (!restroSnap.exists()) {
        setAuthError("Restaurant does not exist");
        await signOut(auth);
        return;
      }

      const data = restroSnap.data();
      if (data.adminUid === user.uid || data.adminEmail === user.email) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem(`dinebyte_auth_${slug}`, "true");
        setAuthError("");
      } else {
        setAuthError("This Google account is not associated with this restaurant");
        await signOut(auth);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError("Google Authentication failed");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    try {
      const restroRef = doc(db, "restaurants", slug as string);
      const restroSnap = await getDoc(restroRef);
      if (!restroSnap.exists()) {
        setAuthError("Restaurant does not exist");
        return;
      }

      const data = restroSnap.data();

      // if the restaurant has been migrated to Firebase auth use that
      if (data.adminUid) {
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        const user = userCredential.user;
        if (data.adminUid === user.uid) {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem(`dinebyte_auth_${slug}`, "true");
          setAuthError("");
        } else {
          setAuthError("Email is not associated with this restaurant");
          await signOut(auth);
        }
      } else {
        // legacy fallback: treat email field as username
        if (data.admin?.username === adminEmail && data.admin?.password === adminPassword) {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem(`dinebyte_auth_${slug}`, "true");
          setAuthError("");
        } else {
          setAuthError("Invalid username or password");
        }
      }
    } catch (err) {
      console.error(err);
      setAuthError("Authentication failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    setIsAdminAuthenticated(false);
    setAdminEmail("");
    setAdminPassword("");
    sessionStorage.removeItem(`dinebyte_auth_${slug}`);
    try { await signOut(auth); } catch {}
  };

  const handleAddItem = async () => {
    setAddItemError("");
    setAddItemSuccess("");
    if (!newItem.name || newItem.name.trim().length === 0) {
      setAddItemError("Item name is required");
      return;
    }
    if (newItem.price <= 0) {
      setAddItemError("Price must be greater than 0");
      return;
    }
    if (!slug) {
      setAddItemError("Restaurant not found");
      return;
    }
    try {
      await addDoc(collection(db, "restaurants", slug as string, "menu"), {
        ...newItem,
        ingredients: newItem.ingredients || [],
        isAvailable: true,
        createdAt: new Date(),
      });
      setIsAddingItem(false);
      setNewItem({ 
        name: "", 
        description: "", 
        price: 0, 
        category: "Main Course (Veg)",
        type: "veg",
        ingredients: []
      });
      setAddItemSuccess("Item added successfully!");
      setTimeout(() => setAddItemSuccess(""), 3000);
    } catch (e) {
      console.error("Error adding item:", e);
      setAddItemError("Failed to add item. Please try again.");
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !editingItem.name || editingItem.price <= 0 || !slug) return;
    try {
      await updateDoc(doc(db, "restaurants", slug as string, "menu", editingItem.id), {
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        category: editingItem.category,
        ingredients: editingItem.ingredients || []
      });
      setEditingItem(null);
      alert("Item updated successfully!");
    } catch (e) { console.error(e); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?") || !slug) return;
    try {
      await deleteDoc(doc(db, "restaurants", slug as string, "menu", itemId));
    } catch (e) {
      console.error("Error deleting item:", e);
      alert("Failed to delete item.");
    }
  };

  const handleSeedMenu = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/seed-data`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
      const j = await res.json();
      if (res.ok) {
        alert("Seeded menu and tables successfully!");
      } else {
        alert("Seed failed: " + (j.error || res.statusText));
      }
    } catch (e) {
      console.error("Seed error:", e);
      alert("Seed failed");
    }
  };

  const handleSaveSettings = async () => {
    if (!slug) return;
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, "restaurants", slug as string, "settings", "config"), { 
        upiId,
        currency,
        timezone
      }, { merge: true });
      alert("Settings saved successfully!");
    } catch (e) {
      console.error("Error saving settings:", e);
      alert("Failed to save settings.");
    }
    setIsSavingSettings(false);
  };

  const handleAddInventory = async () => {
    if (!slug || !newInventoryItem.name) return;
    try {
      await addDoc(collection(db, "restaurants", slug as string, "inventory"), {
        ...newInventoryItem,
        lastUpdated: serverTimestamp()
      });
      setIsAddingInventory(false);
      setNewInventoryItem({
        name: "",
        quantity: 0,
        unit: "kg",
        lowStockThreshold: 1,
        category: "Vegetables"
      });
    } catch (e) { console.error(e); }
  };

  const handleUpdateStock = async (itemId: string, newQuantity: number) => {
    if (!slug) return;
    try {
      await updateDoc(doc(db, "restaurants", slug as string, "inventory", itemId), {
        quantity: newQuantity,
        lastUpdated: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  };

  const handleDeleteInventory = async (itemId: string) => {
    if (!slug || !confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(db, "restaurants", slug as string, "inventory", itemId));
    } catch (e) { console.error(e); }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const orderRef = doc(db, "restaurants", slug as string, "orders", orderId);
      await updateDoc(orderRef, { orderStatus: status });
      
      if (status === 'ready') {
        notificationManager?.playOrderReady();
      }

      // Automatic Stock Deduction when order is marked as delivered
      if (status === 'delivered') {
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const orderData = orderSnap.data() as Order;
          for (const item of orderData.items) {
            // Fetch the latest menu item data to get ingredients
            const menuQ = query(
              collection(db, "restaurants", slug as string, "menu"),
              where("name", "==", item.name),
              limit(1)
            );
            const menuSnap = await getDocs(menuQ);
            
            if (!menuSnap.empty) {
              const menuData = menuSnap.docs[0].data();
              const ingredients = menuData.ingredients || [];
              
              for (const ingredient of ingredients) {
                const inventoryRef = doc(db, "restaurants", slug as string, "inventory", ingredient.inventoryItemId);
                const inventorySnap = await getDoc(inventoryRef);
                
                if (inventorySnap.exists()) {
                  const currentQuantity = inventorySnap.data().quantity || 0;
                  const deduction = ingredient.quantity * item.quantity;
                  await updateDoc(inventoryRef, {
                    quantity: Math.max(0, currentQuantity - deduction),
                    lastUpdated: serverTimestamp()
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const handleWastage = async (itemId: string, quantity: number, reason: string) => {
    if (!slug) return;
    try {
      const inventoryRef = doc(db, "restaurants", slug as string, "inventory", itemId);
      const inventorySnap = await getDoc(inventoryRef);
      
      if (inventorySnap.exists()) {
        const currentQuantity = inventorySnap.data().quantity || 0;
        const itemName = inventorySnap.data().name;
        
        // Record wastage
        await addDoc(collection(db, "restaurants", slug as string, "wastage"), {
          inventoryItemId: itemId,
          itemName,
          quantity,
          reason,
          recordedAt: serverTimestamp(),
          recordedBy: "Admin"
        });
        
        // Deduct from inventory
        await updateDoc(inventoryRef, {
          quantity: Math.max(0, currentQuantity - quantity),
          lastUpdated: serverTimestamp()
        });
        
        alert(`Recorded ${quantity} units of wastage for ${itemName}`);
      }
    } catch (e) { console.error(e); }
  };

  const generateDailyReport = async () => {
    if (!slug) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const ordersQ = query(
        collection(db, "restaurants", slug as string, "orders"),
        where("createdAt", ">=", today),
        where("orderStatus", "==", "delivered")
      );
      const ordersSnap = await getDocs(ordersQ);
      
      const wastageQ = query(
        collection(db, "restaurants", slug as string, "wastage"),
        where("recordedAt", ">=", today)
      );
      const wastageSnap = await getDocs(wastageQ);
      
      let totalSales = 0;
      let totalWastageValue = 0; // In a real app, you'd multiply quantity by cost price
      
      ordersSnap.forEach(doc => totalSales += doc.data().totalAmount);
      
      const report = {
        date: today,
        totalOrders: ordersSnap.size,
        totalSales,
        wastageCount: wastageSnap.size,
        inventoryStatus: inventoryItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit
        }))
      };
      
      // Save report
      await addDoc(collection(db, "restaurants", slug as string, "reports"), {
        ...report,
        createdAt: serverTimestamp()
      });
      
      alert(`Daily Report Generated!\nTotal Sales: ${formatPrice(totalSales)}\nOrders: ${ordersSnap.size}`);
    } catch (e) { console.error(e); }
  };

  const updatePaymentStatus = async (orderId: string, status: string) => {
    try {
      const orderRef = doc(db, "restaurants", slug as string, "orders", orderId);
      await updateDoc(orderRef, { paymentStatus: status });
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const isRecentPing = (order: Order) => {
    if (!order.lastPingAt) return false;
    const pingTime = (order.lastPingAt as any).toMillis();
    const now = Date.now();
    return (now - pingTime) < 60000;
  };

  const filteredOrders = orders.filter(o => {
    const currentTab = new URLSearchParams(window.location.search).get('tab');
    if (currentTab === 'live') return !['delivered', 'cancelled'].includes(o.orderStatus);
    if (currentTab === 'completed') return o.orderStatus === 'delivered';
    if (currentTab === 'history') {
      const orderDate = o.createdAt && typeof (o.createdAt as any).toDate === 'function' 
        ? (o.createdAt as any).toDate() 
        : (o.createdAt as any) instanceof Date ? o.createdAt : new Date();
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      return (o.orderStatus === 'delivered' || o.orderStatus === 'cancelled') && orderDate < twelveHoursAgo;
    }
    return o.orderStatus === 'cancelled';
  });

  const stats = {
    revenue: orders.reduce((sum, o) => {
      const orderDate = o.createdAt && typeof (o.createdAt as any).toDate === 'function' 
        ? (o.createdAt as any).toDate() 
        : (o.createdAt as any) instanceof Date ? o.createdAt : new Date();
      const isToday = orderDate.toDateString() === new Date().toDateString();
      return sum + (o.orderStatus === 'delivered' && isToday ? o.totalAmount : 0);
    }, 0),
    activeCount: orders.filter(o => !['delivered', 'cancelled'].includes(o.orderStatus)).length,
    completedToday: orders.filter(o => {
      const orderDate = o.createdAt && typeof (o.createdAt as any).toDate === 'function' 
        ? (o.createdAt as any).toDate() 
        : (o.createdAt as any) instanceof Date ? o.createdAt : new Date();
      return o.orderStatus === 'delivered' && orderDate.toDateString() === new Date().toDateString();
    }).length,
    averageWait: 12
  };

  const isActive = (tab: string) => {
    const currentTab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'dashboard') {
      return !currentTab || currentTab === 'dashboard';
    }
    return currentTab === tab;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-6" />
      <p className="font-black text-gray-900 tracking-widest uppercase text-xl">Initializing Admin...</p>
    </div>
  );

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white relative z-10">
          <div className="w-full max-w-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center lg:text-left mb-12"
            >
              <div className="w-20 h-20 bg-orange-600 rounded-4xl flex items-center justify-center mb-8 rotate-6 shadow-2xl shadow-orange-600/20 mx-auto lg:mx-0 group hover:rotate-0 transition-all duration-500">
                <Lock className="text-white w-10 h-10" />
              </div>
              <h1 className="text-5xl font-black text-gray-900 leading-none tracking-tighter mb-4 uppercase italic">Admin <span className="text-orange-600">Portal</span></h1>
              <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] flex items-center justify-center lg:justify-start gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" /> Secure Terminal 01
              </p>
            </motion.div>
            
            <form onSubmit={handleAdminLogin} className="space-y-8">
              <div className="space-y-3">
                <label htmlFor="admin-email" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Access Email</label>
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors" size={20} />
                  <input 
                    id="admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@dinebyte.com"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600/20 focus:bg-white rounded-3xl py-6 pl-16 pr-8 text-gray-900 font-black transition-all outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="admin-pass" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Security Key</label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!adminEmail) return setAuthError("Enter your email to reset password");
                      try {
                        await sendPasswordResetEmail(auth, adminEmail);
                        setAuthError("Password reset email sent");
                      } catch (e: any) {
                        setAuthError(e.message || "Failed to send reset email");
                      }
                    }}
                    className="text-[9px] font-black text-orange-600 uppercase tracking-widest hover:underline"
                  >Forgot Key?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors" size={20} />
                  <input 
                    id="admin-pass"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600/20 focus:bg-white rounded-3xl py-6 pl-16 pr-8 text-gray-900 font-black tracking-[0.5em] transition-all outline-none text-sm"
                  />
                </div>
              </div>

              {authError && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-50 text-red-600 p-5 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border border-red-100"
                >
                  <AlertCircle size={18} /> {authError}
                </motion.div>
              )}

              <div className="space-y-4 pt-4">
                <button 
                  type="submit"
                  className="w-full bg-gray-900 text-white py-6 rounded-3xl font-black text-xs tracking-[0.3em] uppercase shadow-2xl hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-3 group/btn"
                >
                  INITIALIZE SESSION <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  type="button"
                  onClick={handleGoogleAdminLogin}
                  className="w-full bg-white border-2 border-gray-100 text-gray-900 py-5 rounded-3xl font-black text-[10px] tracking-[0.2em] uppercase hover:bg-gray-50 transition-all flex items-center justify-center gap-3 group/google"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Continue with Google
                </button>
              </div>
            </form>

            <div className="mt-12 pt-8 border-t border-gray-100 text-center lg:text-left">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                New to the ecosystem? <a href="/onboarding" className="text-orange-600 hover:underline">Activate Restaurant</a>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: DineByte Ad/Branding */}
        <div className="hidden lg:flex w-1/2 bg-gray-900 relative overflow-hidden items-center justify-center p-20">
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 w-full h-full opacity-30">
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-orange-600 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[120px] animate-pulse delay-1000" />
          </div>
          
          <div className="relative z-10 text-center max-w-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-3 p-4">
                <img src="/moclogo.png" alt="DineByte Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-6xl font-black text-white tracking-tighter mb-6 leading-none uppercase italic">
                Dine<span className="text-orange-600">Byte</span>
              </h2>
              <p className="text-orange-500 font-black uppercase tracking-[0.5em] text-xs mb-10">Next-Gen Restaurant OS</p>
              
              <div className="grid grid-cols-2 gap-6 text-left">
                <div className="p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center mb-4 text-orange-500 group-hover:scale-110 transition-transform">
                    <Activity size={20} />
                  </div>
                  <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-2">Live Analytics</h4>
                  <p className="text-gray-400 text-[9px] font-bold leading-relaxed uppercase tracking-wider">Real-time data synchronization across all terminals.</p>
                </div>
                <div className="p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                    <ShieldAlert size={20} />
                  </div>
                  <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-2">Fraud Shield</h4>
                  <p className="text-gray-400 text-[9px] font-bold leading-relaxed uppercase tracking-wider">Military-grade geofencing and security protocols.</p>
                </div>
                <div className="p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center mb-4 text-purple-500 group-hover:scale-110 transition-transform">
                    <BrainCircuit size={20} />
                  </div>
                  <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-2">AI Insights</h4>
                  <p className="text-gray-400 text-[9px] font-bold leading-relaxed uppercase tracking-wider">Predictive business intelligence powered by Gemini.</p>
                </div>
                <div className="p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center mb-4 text-emerald-500 group-hover:scale-110 transition-transform">
                    <IndianRupee size={20} />
                  </div>
                  <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-2">Smart Billing</h4>
                  <p className="text-gray-400 text-[9px] font-bold leading-relaxed uppercase tracking-wider">Automated ledger and digital invoice generation.</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Decorative Grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-size-[40px_40px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col min-h-screen bg-gray-50/50">
        <div className="p-6 lg:p-10 max-w-400 mx-auto flex-1 w-full">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-xl px-10 py-8 rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.02)] mb-10 flex flex-col md:flex-row items-center justify-between border border-gray-100/50 group">
            <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
              <div className="relative">
                <div className="w-16 h-16 bg-linear-to-tr from-orange-600 to-orange-400 rounded-2xl flex items-center justify-center text-white font-black shadow-2xl shadow-orange-600/20 group-hover:scale-110 transition-transform duration-500">
                  {restaurant?.name?.charAt(0).toUpperCase() || 'D'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2 justify-center md:justify-start">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase group-hover:text-orange-600 transition-colors">{restaurant?.name || 'Admin Panel'}</h2>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                    <span className="text-[10px] text-green-600 font-black uppercase tracking-widest">Live Node</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                  <span className="flex items-center gap-2.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Calendar size={14} className="text-orange-500" /> {format(new Date(), 'EEEE, MMM do')}
                  </span>
                  <span className="flex items-center gap-2.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Activity size={14} className="text-blue-500" /> System: Optimized
                  </span>
                  <span className="flex items-center gap-2.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Timer size={14} className="text-purple-500" /> Latency: 24ms
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 mt-8 md:mt-0">
              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                <DarkToggle />
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <a 
                  href={`/${slug}/menu`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-3 bg-white text-gray-900 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm border border-gray-100 group/nav" 
                  title="View Public Menu"
                >
                  <Navigation size={20} className="group-hover/nav:rotate-12 transition-transform" />
                </a>
              </div>
              <button 
                onClick={() => window.print()}
                className="hidden md:flex items-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-2xl active:scale-95 group/print"
              >
                <FileText size={16} className="group-hover/print:scale-110 transition-transform" /> PRINT REPORT
              </button>
            </div>
          </header>

          {/* Dashboard View */}
          {isActive('dashboard') && (
            <div className="space-y-10">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700 rotate-12">
                    <IndianRupee size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <IndianRupee size={24} className="text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Today's Revenue</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">{formatPrice(stats.revenue)}</p>
                    <div className="mt-6 flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-50 w-fit px-3 py-1.5 rounded-lg">
                      <ArrowUpRight size={14} /> +12.5% vs Last Week
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700 -rotate-12">
                    <ShoppingBag size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <ShoppingBag size={24} className="text-orange-600" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Active Orders</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats.activeCount}</p>
                    <div className="mt-6 flex items-center gap-2 text-orange-500 font-black text-[10px] uppercase tracking-widest bg-orange-50 w-fit px-3 py-1.5 rounded-lg">
                      <Clock size={14} /> Live in Kitchen
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700">
                    <CheckCircle2 size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <CheckCircle2 size={24} className="text-blue-600" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Delivered Today</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats.completedToday}</p>
                    <div className="mt-6 flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-widest bg-blue-50 w-fit px-3 py-1.5 rounded-lg">
                      <User size={14} /> Happy Customers
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl shadow-orange-600/20 text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-500"
                >
                  <div className="absolute -top-10 -right-10 p-4 opacity-20 group-hover:scale-125 transition-transform duration-700 text-white rotate-12">
                    <TableIcon size={180} />
                  </div>
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                        <TableIcon size={24} className="text-orange-500" />
                      </div>
                      <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em] mb-2">Occupancy Rate</p>
                      <p className="text-4xl font-black tracking-tighter">85% <span className="text-lg text-orange-500 uppercase tracking-widest ml-1">Full</span></p>
                    </div>
                    <button 
                      onClick={() => router.push(`/${slug}/admin/tables`)}
                      className="mt-8 flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-500 px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-xl group/btn"
                      type="button"
                    >
                      MANAGE TABLES <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* AI Business Insights Section - ULTRA PRO GLASSMORPHISM */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative p-0.5 rounded-[3rem] overflow-hidden group shadow-2xl"
              >
                {/* Animated Border Gradient */}
                <div className="absolute inset-0 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-xy group-hover:scale-110 transition-transform duration-1000 opacity-70" />
                
                <div className="relative bg-gray-900/95 backdrop-blur-3xl p-10 md:p-14 rounded-[2.9rem] overflow-hidden">
                  {/* Decorative Elements */}
                  <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
                  <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-700" />
                  
                  <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl group-hover:rotate-12 transition-all duration-500">
                            <BrainCircuit className="text-indigo-400" size={32} />
                          </div>
                          <div>
                            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter flex items-center gap-4">
                              GEMINI AI <span className="bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">INTELLIGENCE</span>
                            </h3>
                            <div className="flex items-center gap-3">
                              <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-[0.3em] flex items-center gap-2">
                                <SparklesIcon size={14} className="text-yellow-400" /> BIHAR'S FIRST AI-POWERED RESTAURANT ENGINE
                              </p>
                              <span className="bg-orange-600/20 text-orange-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-orange-500/20 tracking-[0.2em] uppercase">Coming Soon</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-300 text-lg font-medium leading-relaxed max-w-2xl">
                          Harness the power of Google's advanced neural networks to analyze your restaurant's data in real-time. 
                          Get instant recommendations on menu pricing, peak hour management, and customer satisfaction.
                        </p>
                      </div>
                      
                      <button 
                        onClick={fetchAiInsights}
                        disabled={isAiLoading}
                        className="relative group/ai-btn overflow-hidden px-10 py-6 bg-white text-gray-900 rounded-4xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-white/20 transition-all duration-500 disabled:opacity-50 active:scale-95 shrink-0"
                      >
                        <div className="absolute inset-0 bg-linear-to-r from-indigo-500 to-purple-600 opacity-0 group-hover/ai-btn:opacity-10 transition-opacity" />
                        <span className="relative flex items-center gap-4">
                          {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <TrendingUp size={20} className="text-indigo-600" />}
                          {aiInsights ? 'REFRESH ANALYTICS' : 'GENERATE INSIGHTS'}
                        </span>
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {aiInsights ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -30 }}
                          className="mt-12 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 shadow-inner group/insight"
                        >
                          <div className="prose prose-invert max-w-none">
                            <div className="text-white space-y-6 font-bold leading-relaxed whitespace-pre-wrap text-lg md:text-xl">
                              {aiInsights.split('\n').map((line, i) => (
                                <p key={i} className={line.startsWith('*') ? 'text-indigo-300 flex items-start gap-3' : 'text-gray-200'}>
                                  {line.startsWith('*') && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 shrink-0" />}
                                  {line.replace(/\*/g, '')}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-3 text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em]">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" /> ENGINE: GEMINI-1.5-FLASH
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
                              <Check size={14} /> STATUS: OPTIMIZED
                            </div>
                          </div>
                        </motion.div>
                      ) : !isAiLoading && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-12 text-center py-16 border-2 border-dashed border-white/5 rounded-[3rem] group/empty hover:border-white/10 transition-all"
                        >
                          <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 group-hover/empty:scale-110 transition-transform duration-500 group-hover/empty:bg-white/10">
                            <BrainCircuit className="text-white/20" size={48} />
                          </div>
                          <p className="text-gray-400 font-bold text-lg max-w-md mx-auto leading-relaxed">
                            Data processing unit ready. <br />
                            <span className="text-white">Run analytics to unlock business potential.</span>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions & Recent Transmissions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100">
                  <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                      <Navigation size={20} className="text-orange-600" />
                    </div>
                    QR TERMINAL
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="p-8 bg-gray-50/50 rounded-[2.5rem] flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-500 border border-transparent hover:border-orange-100">
                      <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 group-hover:scale-110 transition-transform duration-500">
                        <QRCodeSVG 
                          value={`${window.location.origin}/${slug}/auth`}
                          size={140}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="font-black text-gray-900 text-lg mb-2">Main Gate QR</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-6">Customer Onboarding</p>
                      <button 
                        onClick={() => window.open(`${window.location.origin}/${slug}/auth`)}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg active:scale-95"
                      >
                        TEST LINK
                      </button>
                    </div>
                    <div className="p-8 bg-gray-50/50 rounded-[2.5rem] flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-500 border border-transparent hover:border-orange-100">
                      <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 group-hover:scale-110 transition-transform duration-500">
                        <QRCodeSVG 
                          value={`${window.location.origin}/${slug}/menu`}
                          size={140}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="font-black text-gray-900 text-lg mb-2">Direct Menu</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-6">Quick View Mode</p>
                      <button 
                        onClick={() => window.open(`${window.location.origin}/${slug}/menu`)}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg active:scale-95"
                      >
                        TEST LINK
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                        <Activity size={20} className="text-orange-600" />
                      </div>
                      TRANSMISSIONS
                    </h3>
                    <button 
                      onClick={() => handleTabChange('live')} 
                      className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] hover:bg-orange-50 px-4 py-2 rounded-xl transition-all"
                    >
                      VIEW ALL
                    </button>
                  </div>
                  <div className="space-y-4 flex-1">
                    {orders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-10 opacity-20">
                        <ShoppingBag size={48} className="mb-4" />
                        <p className="font-black text-xs uppercase tracking-widest">No active traffic</p>
                      </div>
                    ) : (
                      orders.slice(0, 5).map(order => (
                        <motion.div 
                          key={order.id} 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100"
                        >
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform ${order.type === 'dinein' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
                              <span className="text-[10px] uppercase opacity-60 font-bold">{order.type === 'dinein' ? 'T' : 'TW'}</span>
                              <span className="text-lg leading-none mt-1">{order.type === 'dinein' ? order.tableNumber : '•'}</span>
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-base">{order.customerName}</p>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{order.items.length} Items • {formatPrice(order.totalAmount)}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border ${
                            order.orderStatus === 'received' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            order.orderStatus === 'preparing' ? 'bg-orange-50 text-orange-600 border-orange-100 animate-pulse' :
                            order.orderStatus === 'ready' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'
                          }`}>
                            {order.orderStatus}
                          </span>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Orders View */}
          {(isActive('live') || isActive('completed') || isActive('history')) && (
            <div className="space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-1">
                    {isActive('live') ? 'Live Transmissions' : isActive('completed') ? 'Success Logs' : 'Archived Orders'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">
                    Real-time monitoring and order management
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-xl transition-all duration-300 ${viewMode === 'grid' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    title="Grid View"
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-3 rounded-xl transition-all duration-300 ${viewMode === 'list' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    title="List View"
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] border-2 border-dashed border-gray-100"
                >
                  <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-8 opacity-40">
                    <ShoppingBag size={48} className="text-gray-400" />
                  </div>
                  <p className="text-xl font-black text-gray-900 mb-2">No active signals</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Everything is up to date in the cloud</p>
                </motion.div>
              ) : (
                <div className={`grid gap-8 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'}`}>
                  {filteredOrders.map(order => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={order.id} 
                      className={`bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border-2 overflow-hidden flex flex-col group hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] transition-all duration-500 ${
                        viewMode === 'list' ? 'md:flex-row md:items-center' : ''
                      } ${isRecentPing(order) ? 'border-orange-500 ring-8 ring-orange-50 animate-pulse' : 'border-gray-50'}`}
                    >
                      {/* Order Header Info */}
                      <div className={`p-10 ${viewMode === 'list' ? 'md:w-1/4' : 'border-b border-gray-50'}`}>
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-wrap items-center gap-3">
                            {order.type === 'dinein' ? (
                              <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-lg shadow-blue-600/20">
                                <TableIcon size={14} /> TABLE {order.tableNumber}
                              </span>
                            ) : (
                              <span className="bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-lg shadow-purple-600/20">
                                <ShoppingBag size={14} /> TAKEAWAY
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 font-black tracking-widest bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">#{order.id?.slice(-6).toUpperCase()}</span>
                          </div>
                          
                          {isRecentPing(order) && (
                            <div className="bg-orange-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-3 animate-bounce shadow-xl shadow-orange-600/30">
                              <Bell size={14} /> CUSTOMER CALLING!
                            </div>
                          )}

                          <div>
                            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 group-hover:text-orange-600 transition-colors">
                              {order.customerName}
                            </h3>
                            <p className="text-xs font-bold text-gray-400 mt-2 flex items-center gap-2 bg-gray-50 w-fit px-3 py-1.5 rounded-lg border border-gray-100">
                              <Phone size={14} className="text-orange-500" /> +{order.customerMobile}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest"><Clock size={14} /> {order.createdAt ? format((order.createdAt as any).toDate(), 'hh:mm a') : 'Now'}</span>
                            <span className="text-lg font-black text-orange-600">{formatPrice(order.totalAmount + (order.taxAmount || 0))}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className={`p-10 bg-gray-50/30 flex-1 border-x border-gray-50/50 ${viewMode === 'list' ? 'md:w-2/4' : ''}`}>
                        <div className="space-y-5">
                          {order.items.map((item: OrderItem, idx: number) => (
                            <div key={idx} className="flex justify-between items-start group/item bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-orange-200 transition-all">
                              <div className="flex items-center gap-4">
                                <span className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center text-sm font-black shadow-lg shadow-orange-600/20">
                                  {item.quantity}
                                </span>
                                <div className="flex flex-col">
                                  <span className="font-black text-gray-900 text-base leading-tight">{item.name}</span>
                                  {item.variantName && (
                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1">{item.variantName}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-black text-gray-400 mt-1">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className={`p-10 bg-white flex flex-col gap-6 ${viewMode === 'list' ? 'md:w-1/4' : ''}`}>
                        <div className="flex items-center justify-between mb-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {order.paymentType} • {order.paymentStatus}
                            </span>
                          </div>
                          {order.paymentStatus !== 'paid' && isActive('live') && (
                            <button 
                              onClick={() => updatePaymentStatus(order.id!, 'paid')} 
                              className="text-[9px] font-black bg-emerald-600 text-white px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-lg shadow-emerald-600/20"
                            >
                              MARK PAID
                            </button>
                          )}
                        </div>

                        {isActive('live') && (
                          <div className="flex flex-col gap-3">
                            {order.orderStatus === 'received' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id!, 'preparing')} 
                                className="w-full bg-orange-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-orange-600/30 hover:bg-orange-500 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group/btn"
                              >
                                <ChefHat size={20} className="group-hover/btn:rotate-12 transition-transform" /> START COOKING
                              </button>
                            )}
                            {order.orderStatus === 'preparing' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id!, 'ready')} 
                                className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group/btn"
                              >
                                <Bell size={20} className="group-hover/btn:animate-swing transition-transform" /> READY FOR PICKUP
                              </button>
                            )}
                            {order.orderStatus === 'ready' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id!, 'delivered')} 
                                className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-600/30 hover:bg-emerald-500 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group/btn"
                              >
                                <CheckCircle2 size={20} className="group-hover/btn:scale-110 transition-transform" /> COMPLETE ORDER
                              </button>
                            )}
                          </div>
                        )}
                        {['delivered', 'cancelled'].includes(order.orderStatus) && (
                          <div className={`w-full py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] text-center border-2 border-dashed ${
                            order.orderStatus === 'delivered' ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' : 'bg-red-50/50 text-red-600 border-red-100'
                          }`}>
                            Order {order.orderStatus}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inventory Mgmt View */}
          {isActive('inventory') && (
            <div className="space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-1">Inventory Management</h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Real-time stock tracking and wastage monitoring</p>
                </div>
                <button 
                  onClick={() => setIsAddingInventory(true)}
                  className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3"
                >
                  <Plus size={18} /> ADD NEW ITEM
                </button>
              </div>

              {/* Low Stock Alerts */}
              {inventoryItems.some(item => item.quantity <= item.lowStockThreshold) && (
                <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2.5rem] flex items-center gap-6 animate-pulse">
                  <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-red-600/20">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-red-600 uppercase tracking-widest text-xs">CRITICAL STOCK ALERT</h4>
                    <p className="text-red-900/60 text-sm font-bold">
                      {inventoryItems.filter(item => item.quantity <= item.lowStockThreshold).length} items are running low. Please restock immediately.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Inventory List */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-50">
                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Name</th>
                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Level</th>
                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {inventoryItems.map((item) => (
                            <tr key={item.id} className="group">
                              <td className="py-6 pr-4">
                                <p className="font-black text-gray-900">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Updated: {item.lastUpdated ? format((item.lastUpdated as any).toDate(), 'MMM d, HH:mm') : 'N/A'}</p>
                              </td>
                              <td className="py-6 pr-4">
                                <div className="flex items-center gap-3">
                                  <span className={`text-lg font-black ${item.quantity <= item.lowStockThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                                    {item.quantity} {item.unit}
                                  </span>
                                </div>
                              </td>
                              <td className="py-6 pr-4">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-6 pr-4">
                                {item.quantity <= 0 ? (
                                  <span className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Out of Stock</span>
                                ) : item.quantity <= item.lowStockThreshold ? (
                                  <span className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Low Stock</span>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Healthy</span>
                                )}
                              </td>
                              <td className="py-6 text-right">
                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleUpdateStock(item.id, item.quantity + 1)} 
                                    className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                                    title="Increase Stock"
                                  >
                                    <Plus size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateStock(item.id, Math.max(0, item.quantity - 1))} 
                                    className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                                    title="Decrease Stock"
                                  >
                                    <Minus size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteInventory(item.id)} 
                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete Inventory Item"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Quick Stats & Reports */}
                <div className="space-y-10">
                  <div className="bg-gray-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                      <SparklesIcon size={120} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="text-xl font-black uppercase tracking-widest mb-6">AI Predictions</h4>
                      <p className="text-gray-400 text-sm font-bold leading-relaxed mb-8">
                        Gemini is analyzing your stock usage patterns. Smart restocking suggestions will appear here.
                      </p>
                      <div className="flex items-center gap-3 text-[10px] font-black text-orange-500 uppercase tracking-widest">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                        AI Analysis: Coming Soon
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-gray-100">
                    <h4 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600"><FileText size={20} /></div>
                      Daily Reports
                    </h4>
                    <div className="space-y-4">
                      <button 
                        onClick={generateDailyReport}
                        className="w-full p-5 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-orange-600 transition-all duration-300"
                        title="Generate Daily Closing Stock Report"
                      >
                        <div className="text-left">
                          <p className="font-black text-gray-900 group-hover:text-white transition-colors">Closing Stock</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase group-hover:text-white/60">Generate EOD Report</p>
                        </div>
                        <ArrowRight size={20} className="text-gray-300 group-hover:text-white transition-all group-hover:translate-x-1" />
                      </button>
                      <button 
                        onClick={() => {
                          const itemId = prompt("Enter Inventory Item ID:");
                          if (!itemId) return;
                          const quantity = parseFloat(prompt("Enter Quantity to Mark as Wastage:") || "0");
                          if (quantity <= 0) return;
                          const reason = prompt("Enter Reason for Wastage (e.g., Expired, Spilled):") || "Unspecified";
                          handleWastage(itemId, quantity, reason);
                        }}
                        className="w-full p-5 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-red-600 transition-all duration-300"
                        title="Record Wastage for an Item"
                      >
                        <div className="text-left">
                          <p className="font-black text-gray-900 group-hover:text-white transition-colors">Wastage Logs</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase group-hover:text-white/60">Track Spoilage</p>
                        </div>
                        <ArrowRight size={20} className="text-gray-300 group-hover:text-white transition-all group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Inventory Modal */}
              <AnimatePresence>
                {isAddingInventory && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setIsAddingInventory(false)}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Add Inventory Item</h3>
                        <button 
                          onClick={() => setIsAddingInventory(false)} 
                          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                          title="Close Modal"
                        >
                          <X size={24} className="text-gray-400" />
                        </button>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label htmlFor="item-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item Name</label>
                          <input 
                            id="item-name"
                            type="text" 
                            placeholder="e.g. Tomato, Milk, Basmati Rice" 
                            value={newInventoryItem.name} 
                            onChange={(e) => setNewInventoryItem({...newInventoryItem, name: e.target.value})} 
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold text-gray-900 outline-none" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="initial-stock" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Stock</label>
                            <input 
                              id="initial-stock"
                              type="number" 
                              value={newInventoryItem.quantity} 
                              onChange={(e) => setNewInventoryItem({...newInventoryItem, quantity: parseInt(e.target.value) || 0})} 
                              className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold text-gray-900 outline-none" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="unit-select" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit</label>
                            <select 
                              id="unit-select"
                              title="Select Unit"
                              value={newInventoryItem.unit} 
                              onChange={(e) => setNewInventoryItem({...newInventoryItem, unit: e.target.value})} 
                              className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold text-gray-900 outline-none appearance-none"
                            >
                              <option value="kg">kg (Kilogram)</option>
                              <option value="ltr">ltr (Liter)</option>
                              <option value="pcs">pcs (Pieces)</option>
                              <option value="gm">gm (Gram)</option>
                              <option value="ml">ml (Milliliter)</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="threshold" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Low Stock Alert Threshold</label>
                          <input 
                            id="threshold"
                            type="number" 
                            value={newInventoryItem.lowStockThreshold} 
                            onChange={(e) => setNewInventoryItem({...newInventoryItem, lowStockThreshold: parseInt(e.target.value) || 1})} 
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold text-gray-900 outline-none" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="category-select" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                          <select 
                            id="category-select"
                            title="Select Category"
                            value={newInventoryItem.category} 
                            onChange={(e) => setNewInventoryItem({...newInventoryItem, category: e.target.value})} 
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold text-gray-900 outline-none appearance-none"
                          >
                            <option value="Vegetables">Vegetables</option>
                            <option value="Dairy">Dairy</option>
                            <option value="Grains">Grains</option>
                            <option value="Spices">Spices</option>
                            <option value="Meat/Poultry">Meat/Poultry</option>
                            <option value="Beverages">Beverages</option>
                            <option value="Packaging">Packaging</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        onClick={handleAddInventory} 
                        className="w-full mt-10 py-5 bg-orange-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-orange-600/20 active:scale-[0.98] transition-all"
                        title="Confirm Addition"
                      >
                        CONFIRM ADDITION
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Menu Mgmt View */}
          {isActive('menu') && (
            <div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900">Manage Menu</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSeedMenu} 
                    className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all" 
                    title="Seed Indian Basics"
                    type="button"
                    aria-label="Seed Indian Basics"
                  >
                    <Utensils size={18} /> SEED INDIAN BASICS
                  </button>
                  <button 
                    onClick={() => setIsAddingItem(true)} 
                    className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all" 
                    title="Add New Item"
                    type="button"
                    aria-label="Add New Item"
                  >
                    <Plus size={18} /> ADD NEW ITEM
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {menuItems.map((item: any) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:shadow-md transition-all"
                  >
                    <div>
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{item.category}</p>
                      <p className="font-black text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-black text-gray-900">{formatPrice(item.price)}</p>
                      <button 
                         onClick={() => { setEditingItem(item); setIsAddingItem(true); }} 
                         className="text-gray-300 hover:text-blue-500 transition-colors" 
                         title="Edit Item"
                         type="button"
                         aria-label="Edit Item"
                       >
                         <Edit2 size={18} />
                       </button>
                       <button 
                         onClick={() => handleDeleteItem(item.id)} 
                         className="text-gray-300 hover:text-red-500 transition-colors" 
                         title="Delete Item"
                         type="button"
                         aria-label="Delete Item"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Menu Item Modal */}
          <MenuItemModal
            isOpen={isAddingItem || !!editingItem}
            isEditing={!!editingItem}
            categories={categories}
            onSave={editingItem ? handleEditItem : handleAddItem}
            onClose={() => {
              setIsAddingItem(false);
              setEditingItem(null);
              setAddItemError("");
              setAddItemSuccess("");
              setNewItem({ 
                name: "", 
                description: "", 
                price: 0, 
                category: "Main Course (Veg)",
                type: "veg",
                ingredients: []
              });
            }}
            newItem={editingItem || newItem}
            setNewItem={editingItem ? setEditingItem : setNewItem}
            error={addItemError || editItemError}
            success={addItemSuccess}
            inventoryItems={inventoryItems}
          />

          {/* Settings View */}
          {isActive('settings') && (
            <div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100 max-w-2xl space-y-10">
              <h3 className="text-2xl font-black text-gray-900">System Configuration</h3>
              
              <div className="space-y-6 pb-10 border-b border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Currency</label>
                    <select 
                      value={currency} 
                      onChange={e => setCurrency(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold text-gray-900 outline-none"
                      title="Select Currency"
                    >
                      <option value="INR">Indian Rupee (₹)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Timezone</label>
                    <select 
                      value={timezone} 
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold text-gray-900 outline-none"
                      title="Select Timezone"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="upi-id" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">UPI ID for Payments</label>
                  <div className="flex gap-2">
                    <input 
                      id="upi-id"
                      value={upiId} 
                      onChange={e => setUpiId(e.target.value)} 
                      placeholder="yourname@upi" 
                      className="flex-1 bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold text-gray-900" 
                    />
                    <button 
                      onClick={handleSaveSettings} 
                      disabled={isSavingSettings} 
                      className="bg-orange-600 text-white px-8 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-orange-700 transition-all" 
                      type="button" 
                      title="Save Settings"
                    >
                      {isSavingSettings ? <Loader2 className="animate-spin" /> : <Save size={18} />} SAVE
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pb-10 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">🤖 AutoBot System</h3>
                <p className="text-sm text-gray-600">Automatically manage orders when you're not available</p>
                
                <div className="flex items-center justify-between">
                  <p className="font-black text-gray-900">Enable AutoBot</p>
                  <button 
                    onClick={() => setAutoBotEnabled(!autoBotEnabled)} 
                    className={`w-16 h-10 rounded-full p-1 transition-all ${autoBotEnabled ? 'bg-orange-600' : 'bg-gray-200'}`} 
                    type="button"
                    title="Toggle AutoBot"
                    aria-label="Toggle AutoBot"
                  >
                    <div className={`w-8 h-8 bg-white rounded-full shadow-md transition-all ${autoBotEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {autoBotEnabled && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <div>
                      <label htmlFor="prepare-delay" className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1 block mb-2">Auto-Prepare Delay (seconds)</label>
                      <input 
                        id="prepare-delay"
                        type="number" 
                        min={1} 
                        value={autoBotDelay.prepare} 
                        onChange={(e) => setAutoBotDelay({ ...autoBotDelay, prepare: parseInt(e.target.value) || 5 })}
                        className="w-full bg-white border-2 border-orange-200 rounded-xl py-2 px-3 font-bold text-gray-900 focus:border-orange-600 transition-all"
                        placeholder="Enter seconds"
                        title="Auto-Prepare Delay in seconds"
                      />
                      <p className="text-[10px] text-gray-600 mt-1">After order received, auto-move to preparing after X seconds</p>
                    </div>
                    <div>
                      <label htmlFor="ready-delay" className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1 block mb-2">Auto-Ready Delay (seconds)</label>
                      <input 
                        id="ready-delay"
                        type="number" 
                        min={1} 
                        value={autoBotDelay.ready} 
                        onChange={(e) => setAutoBotDelay({ ...autoBotDelay, ready: parseInt(e.target.value) || 15 })}
                        className="w-full bg-white border-2 border-orange-200 rounded-xl py-2 px-3 font-bold text-gray-900 focus:border-orange-600 transition-all"
                        placeholder="Enter seconds"
                        title="Auto-Ready Delay in seconds"
                      />
                      <p className="text-[10px] text-gray-600 mt-1">After preparing, auto-move to ready after X seconds</p>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6 pb-10 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">Website & Social</h3>
                <a 
                  href="https://www.dinebyte.in" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block p-4 bg-linear-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl hover:shadow-lg transition-all"
                  title="Visit DineByte Website"
                >
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">DineByte Official</p>
                  <p className="font-black text-gray-900">🌐 www.dinebyte.in</p>
                </a>
              </div>

              <div className="pt-10 border-t border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-8">🔔 Notifications</h3>
                <div className="flex items-center justify-between mb-6">
                  <p className="font-black text-gray-900">Enable Audio Alerts</p>
                  <button onClick={() => { const next = !notifSettings.enabled; setNotifSettings(prev => ({ ...prev, enabled: next })); notificationManager?.saveSettings(notifSettings.volume, next); }} className={`w-16 h-10 rounded-full p-1 transition-all ${notifSettings.enabled ? 'bg-orange-600' : 'bg-gray-200'}`} type="button" title="Toggle Notifications" aria-label="Toggle Notifications"><div className={`w-8 h-8 bg-white rounded-full shadow-md transition-all ${notifSettings.enabled ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                </div>
                <button 
                  onClick={() => notificationManager?.playNewOrder()}
                  className="bg-gray-100 text-gray-900 px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-gray-200 transition-all"
                  type="button"
                >
                  <Volume2 size={18} /> TEST NOTIFICATION SOUND
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
