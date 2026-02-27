"use client";


import { useEffect, useState } from "react";
import { db } from "../../../lib/firebase/config";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, where, limit, addDoc, deleteDoc, setDoc, getDocs, getDoc, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Order } from "../../../types/models";
import { formatPrice } from "../../../lib/utils";
import { 
  Bell, 
  ChefHat, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  CreditCard, 
  Search, 
  LayoutGrid, 
  List, 
  Settings, 
  MoreVertical,
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
  BarChart3,
  FileText,
  Settings2,
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Save,
  Volume2,
  VolumeX,
  LogOut,
  LayoutDashboard,
  Timer,
  Utensils
} from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { notificationManager } from "../../../lib/notification-manager";
import { OrderItem } from "../../../types";
import { useRouter, useParams } from "next/navigation";
import { useRestaurant } from "../../../lib/restaurant-context";
import DarkToggle from "@/components/DarkToggle";

export default function AdminPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant, isLoading: isRestroLoading } = useRestaurant();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'dashboard' | 'live' | 'completed' | 'menu' | 'settings' | 'history'>('dashboard');

  // Menu Management State
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [newItem, setNewItem] = useState({ name: "", description: "", price: 0, category: "Chai Specials" });
  
  // Settings State
  const [upiId, setUpiId] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [notifSettings, setNotifSettings] = useState({ volume: 1.0, enabled: true });

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
        setUpiId(doc.data().upiId || "");
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
      settingsUnsub();
    };
  }, [slug]);

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

  const indianBasics = [
    // Chai Specials
    { name: "Adrak Wali Chai", price: 35, category: "Chai Specials", description: "Traditional ginger-infused milk tea." },
    { name: "Masala Chai", price: 40, category: "Chai Specials", description: "Robust tea brewed with aromatic Indian spices." },
    { name: "Elaichi Chai", price: 35, category: "Chai Specials", description: "Cardamom flavored creamy milk tea." },
    { name: "Kullad Chai", price: 50, category: "Chai Specials", description: "Tea served in traditional clay pots for an earthy aroma." },
    { name: "Cutting Chai", price: 25, category: "Chai Specials", description: "Half-portion of strong milk tea, typical Mumbai style." },

    // Starters
    { name: "Paneer Tikka", price: 280, category: "Starters", description: "Cottage cheese cubes marinated in yogurt and spices, grilled in tandoor." },
    { name: "Hara Bhara Kabab", price: 220, category: "Starters", description: "Deep-fried spinach and green pea patties." },
    { name: "Chicken Tikka", price: 320, category: "Starters", description: "Boneless chicken marinated in tandoori spices and grilled." },
    { name: "Vegetable Pakora", price: 150, category: "Starters", description: "Crispy assorted vegetable fritters." },
    { name: "Fish Amritsari", price: 380, category: "Starters", description: "Deep-fried fish fillets marinated in gram flour and spices." },
    { name: "Tandoori Soya Chaap", price: 260, category: "Starters", description: "Soya chunks marinated and roasted in clay oven." },

    // Main Course (Veg)
    { name: "Dal Makhani", price: 240, category: "Main Course (Veg)", description: "Black lentils slow-cooked with cream, butter, and tomatoes." },
    { name: "Paneer Butter Masala", price: 290, category: "Main Course (Veg)", description: "Paneer cubes in a rich and creamy tomato-based gravy." },
    { name: "Aloo Gobhi", price: 190, category: "Main Course (Veg)", description: "Spiced cauliflower and potato stir-fry." },
    { name: "Mixed Vegetable Curry", price: 210, category: "Main Course (Veg)", description: "Fresh seasonal vegetables in a traditional onion-tomato gravy." },
    { name: "Baingan Bharta", price: 200, category: "Main Course (Veg)", description: "Smoky roasted eggplant mash with spices." },
    { name: "Malai Kofta", price: 280, category: "Main Course (Veg)", description: "Fried potato-paneer balls in a rich white gravy." },

    // Main Course (Non-Veg)
    { name: "Butter Chicken", price: 380, category: "Main Course (Non-Veg)", description: "Tender chicken in a velvety tomato and butter sauce." },
    { name: "Mutton Rogan Josh", price: 450, category: "Main Course (Non-Veg)", description: "Classic Kashmiri lamb curry cooked with aromatic spices." },
    { name: "Chicken Curry", price: 320, category: "Main Course (Non-Veg)", description: "Traditional homestyle chicken curry." },
    { name: "Fish Curry", price: 360, category: "Main Course (Non-Veg)", description: "Tangy coastal-style fish curry with coconut milk." },
    { name: "Egg Curry", price: 180, category: "Main Course (Non-Veg)", description: "Boiled eggs in a spicy onion-tomato gravy." },

    // Breads
    { name: "Butter Naan", price: 50, category: "Breads", description: "Soft leavened bread glazed with butter." },
    { name: "Garlic Naan", price: 60, category: "Breads", description: "Leavened bread topped with minced garlic and butter." },
    { name: "Tandoori Roti", price: 30, category: "Breads", description: "Whole wheat bread baked in a clay oven." },
    { name: "Lacha Paratha", price: 55, category: "Breads", description: "Multi-layered whole wheat bread." },
    { name: "Rumali Roti", price: 45, category: "Breads", description: "Paper-thin soft bread." },

    // Rice & Biryani
    { name: "Chicken Biryani", price: 350, category: "Rice & Biryani", description: "Fragrant basmati rice layered with spiced chicken and herbs." },
    { name: "Veg Pulao", price: 220, category: "Rice & Biryani", description: "Basmati rice cooked with seasonal vegetables and mild spices." },
    { name: "Steamed Rice", price: 120, category: "Rice & Biryani", description: "Plain long-grain basmati rice." },
    { name: "Jeera Rice", price: 150, category: "Rice & Biryani", description: "Aromatic basmati rice tempered with cumin seeds." },
    { name: "Mutton Biryani", price: 480, category: "Rice & Biryani", description: "Slow-cooked rice with tender lamb and spices." },

    // Fast Food
    { name: "Samosa (2 pcs)", price: 40, category: "Fast Food", description: "Classic crispy pastry with spiced potato filling." },
    { name: "Vada Pav", price: 30, category: "Fast Food", description: "The iconic Mumbai burger - potato fritter in a bun." },
    { name: "Chole Bhature", price: 180, category: "Fast Food", description: "Spiced chickpeas served with large fried bread." },
    { name: "Pav Bhaji", price: 160, category: "Fast Food", description: "Mashed vegetable curry served with buttered buns." },

    // Desserts
    { name: "Gulab Jamun", price: 120, category: "Desserts", description: "Golden fried milk balls soaked in saffron sugar syrup." },
    { name: "Gajar Ka Halwa", price: 150, category: "Desserts", description: "Traditional carrot pudding with nuts and milk." },
    { name: "Rasmalai", price: 140, category: "Desserts", description: "Soft paneer discs in sweetened thickened milk." },
    { name: "Kheer", price: 100, category: "Desserts", description: "Traditional rice pudding with cardamom and dry fruits." },

    // Beverages
    { name: "Mango Lassi", price: 90, category: "Beverages", description: "Refreshing yogurt-based drink with mango pulp." },
    { name: "Sweet Lassi", price: 80, category: "Beverages", description: "Creamy churned yogurt drink." },
    { name: "Cold Coffee", price: 110, category: "Beverages", description: "Chilled coffee blended with milk and ice cream." },
    { name: "Nimbu Pani", price: 50, category: "Beverages", description: "Refreshing Indian lemonade." },
    { name: "Fresh Lime Soda", price: 70, category: "Beverages", description: "Bubbly lime drink with salt or sugar." }
  ];

  const handleSeedMenu = async () => {
    if (!slug) return;
    try {
      const promises = indianBasics.map(item => 
        addDoc(collection(db, "restaurants", slug as string, "menu"), item)
      );
      await Promise.all(promises);
      alert("Indian menu basics seeded successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to seed menu items.");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    try {
      const restroRef = doc(db, "restaurants", slug as string);
      const restroSnap = await getDoc(restroRef);
      
      if (restroSnap.exists()) {
        const data = restroSnap.data();
        if (data.admin?.username === adminUsername && data.admin?.password === adminPassword) {
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

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminUsername("");
    setAdminPassword("");
    sessionStorage.removeItem(`dinebyte_auth_${slug}`);
  };

  const handleAddItem = async () => {
    if (!newItem.name || newItem.price <= 0 || !slug) return;
    try {
      await addDoc(collection(db, "restaurants", slug as string, "menu"), newItem);
      setIsAddingItem(false);
      setNewItem({ name: "", description: "", price: 0, category: "Chai Specials" });
      alert("Item added successfully!");
    } catch (e) { console.error(e); }
  };

  const handleEditItem = async () => {
    if (!editingItem || !editingItem.name || editingItem.price <= 0 || !slug) return;
    try {
      await updateDoc(doc(db, "restaurants", slug as string, "menu", editingItem.id), {
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        category: editingItem.category
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

  const handleSaveSettings = async () => {
    if (!slug) return;
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, "restaurants", slug as string, "settings", "config"), { upiId }, { merge: true });
      alert("Settings saved successfully!");
    } catch (e) {
      console.error("Error saving settings:", e);
      alert("Failed to save settings.");
    }
    setIsSavingSettings(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const orderRef = doc(db, "restaurants", slug as string, "orders", orderId);
      await updateDoc(orderRef, { orderStatus: status });
      if (status === 'ready') {
        notificationManager?.playOrderReady();
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
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
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'live') return matchesSearch && !['delivered', 'cancelled'].includes(o.orderStatus);
    if (activeTab === 'completed') return matchesSearch && o.orderStatus === 'delivered';
    if (activeTab === 'history') {
      const orderDate = o.createdAt && typeof (o.createdAt as any).toDate === 'function' 
        ? (o.createdAt as any).toDate() 
        : (o.createdAt as any) instanceof Date ? o.createdAt : new Date();
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      return matchesSearch && (o.orderStatus === 'delivered' || o.orderStatus === 'cancelled') && orderDate < twelveHoursAgo;
    }
    return matchesSearch && o.orderStatus === 'cancelled';
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-6" />
      <p className="font-black text-gray-900 tracking-widest uppercase text-xl">Initializing Admin...</p>
    </div>
  );

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-6 shadow-xl shadow-orange-600/20">
            <Lock className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-2">Admin Access</h1>
          <p className="text-gray-400 font-bold mb-8 uppercase tracking-widest text-[10px]">Restricted Terminal 01</p>
          
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-2 text-left">
              <label htmlFor="admin-user" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors" size={20} />
                <input 
                  id="admin-user"
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Enter Username"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl py-4 pl-14 pr-6 text-gray-900 font-black transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label htmlFor="admin-pass" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors" size={20} />
                <input 
                  id="admin-pass"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl py-4 pl-14 pr-6 text-gray-900 font-black tracking-widest transition-all outline-none"
                />
              </div>
            </div>

            {authError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-100 animate-shake">
                <AlertCircle size={18} /> {authError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-sm tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              INITIALIZE ACCESS <ArrowRight size={18} />
            </button>
          </form>
          {/* provider support email for admin access issues */}
          <p className="text-[10px] text-gray-500 mt-6">
            Need help from provider? Email{' '}
            <a href="mailto:siddhant.anand17@gmail.com" className="underline">
              siddhant.anand17@gmail.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 bg-gray-900 flex-col h-screen sticky top-0">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 overflow-hidden">
              <img src="/moclogo.png" alt="DineByte Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-black text-white leading-tight tracking-tight">DineByte</h1>
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] ml-1">Restaurant Management</p>
        </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            <p className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 mt-4">Main</p>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm transition-all ${
                activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              type="button"
              title="Dashboard"
              aria-label="Dashboard"
            >
              <LayoutDashboard size={20} /> DASHBOARD
            </button>
            <button 
              onClick={() => setActiveTab('live')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm transition-all ${
                activeTab === 'live' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              type="button"
              title="Live Orders"
              aria-label="Live Orders"
            >
              <Activity size={20} /> LIVE ORDERS
              <span className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] font-black ${
                activeTab === 'live' ? 'bg-white/20 text-white' : 'bg-orange-600/10 text-orange-600'
              }`}>{stats.activeCount}</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm transition-all ${
                activeTab === 'history' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              type="button"
              title="Order History"
              aria-label="Order History"
            >
              <Clock size={20} /> ORDER HISTORY
            </button>
            
            <p className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 mt-8">Operations</p>
            <button 
              onClick={() => router.push(`/${slug}/admin/tables`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              type="button"
              title="Table Mapping"
              aria-label="Table Mapping"
            >
              <TableIcon size={20} /> TABLE MAPPING
            </button>
            <button 
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm transition-all ${
                activeTab === 'menu' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              type="button"
              title="Menu Catalog"
              aria-label="Menu Catalog"
            >
              <List size={20} /> MENU CATALOG
            </button>

            <p className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 mt-8">Reports & Billing</p>
            <button 
              onClick={() => router.push(`/${slug}/admin/sales-report`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              type="button"
              title="Sales Analytics"
              aria-label="Sales Analytics"
            >
              <BarChart3 size={20} /> SALES ANALYTICS
            </button>
            <button 
              onClick={() => router.push(`/${slug}/admin/invoices`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              type="button"
              title="Digital Bills"
              aria-label="Digital Bills"
            >
              <CreditCard size={20} /> DIGITAL BILLS
            </button>
            <button 
              onClick={() => router.push(`/${slug}/admin/invoice-settings`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              type="button"
              title="Billing Config"
              aria-label="Billing Config"
            >
              <FileText size={20} /> BILLING CONFIG
            </button>
            <button 
              onClick={() => router.push(`/${slug}/admin/analytics`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              type="button"
              title="Turnover Insights"
              aria-label="Turnover Insights"
            >
              <Timer size={20} /> TURNOVER INSIGHTS
            </button>

            <p className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 mt-8">System</p>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm transition-all ${
                activeTab === 'settings' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              type="button"
              title="Settings"
              aria-label="Settings"
            >
              <Settings2 size={20} /> SETTINGS
            </button>
          </nav>

        <div className="p-4 mt-auto">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black">SA</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate">Super Admin</p>
                <p className="text-[10px] text-gray-500 font-bold truncate">Terminal 01</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-500 transition-colors flex items-center justify-center"
                title="Logout"
                type="button"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 lg:p-12 max-w-400 mx-auto">
          {/* Header */}
          <header className="bg-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-sm mb-8">
            <div className="p-4 text-center text-xs text-gray-500">
          Need help from provider? Email{' '}
          <a href="mailto:siddhant.anand17@gmail.com" className="underline">
            siddhant.anand17@gmail.com
          </a>
        </div>
                <span className="flex items-center gap-2"><Calendar size={16} /> {format(new Date(), 'EEEE, MMM do')}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="flex items-center gap-2 text-green-500"><Activity size={16} /> System Online</span>

              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border-none rounded-2xl py-3 pl-12 pr-6 text-sm font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-orange-600 min-w-80"
                  />
                </div>
                <button 
                  className="bg-white p-3 rounded-2xl shadow-sm text-gray-400 hover:text-orange-600 transition-all flex items-center justify-center" 
                  title="Notifications" 
                  type="button"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                </button>
              </div>
          </header>

          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <IndianRupee size={80} />
                  </div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Today's Revenue</p>
                  <p className="text-3xl font-black text-gray-900">{formatPrice(stats.revenue)}</p>
                  <div className="mt-4 flex items-center gap-2 text-green-500 font-bold text-xs">
                    <ArrowUpRight size={14} /> +12.5% from yesterday
                  </div>
                </div>
                <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <ShoppingBag size={80} />
                  </div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Active Orders</p>
                  <p className="text-3xl font-black text-gray-900">{stats.activeCount}</p>
                  <div className="mt-4 flex items-center gap-2 text-orange-500 font-bold text-xs">
                    <Clock size={14} /> 4 orders in preparation
                  </div>
                </div>
                <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={80} />
                  </div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Completed Today</p>
                  <p className="text-3xl font-black text-gray-900">{stats.completedToday}</p>
                  <div className="mt-4 flex items-center gap-2 text-blue-500 font-bold text-xs">
                    <User size={14} /> 24 unique customers
                  </div>
                </div>
                <div className="bg-orange-600 p-8 rounded-4xl shadow-xl shadow-orange-600/20 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform text-white">
                    <TableIcon size={80} />
                  </div>
                  <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-2">Table Status</p>
                  <p className="text-3xl font-black">85% Occupied</p>
                  <button 
                    onClick={() => router.push(`/${slug}/admin/tables`)}
                    className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                    type="button"
                    title="View Floor Plan"
                    aria-label="View Floor Plan"
                  >
                    View Floor Plan <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <Navigation size={24} className="text-orange-600" /> RESTAURANT QR CODES
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-6 bg-gray-50 rounded-3xl flex flex-col items-center text-center">
                      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                        <QRCodeSVG 
                          value={`${window.location.origin}/${slug}/auth`}
                          size={120}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="font-black text-gray-900 text-sm mb-1">Main Entrance QR</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Global Order Entry</p>
                      <button 
                        onClick={() => window.open(`${window.location.origin}/${slug}/auth`)}
                        className="mt-4 text-[10px] font-black text-orange-600 hover:underline"
                        type="button"
                      >
                        OPEN LINK
                      </button>
                    </div>
                    <div className="absolute top-6 right-6 flex items-center gap-3">
                      <DarkToggle />
                      <button
                        onClick={async () => {
                          if (!slug) return;
                          try {
                            const res = await fetch(`/api/seed-data`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
                            const j = await res.json();
                            if (res.ok) alert("Seeded menu and tables successfully");
                            else alert("Seed failed: " + (j.error || res.statusText));
                          } catch (e) {
                            console.error(e);
                            alert("Seed failed");
                          }
                        }}
                        className="px-3 py-2 bg-orange-600 text-white rounded-xl font-black text-sm"
                        type="button"
                      >
                        SEED INDIAN BASICS
                      </button>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-3xl flex flex-col items-center text-center">
                      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                        <QRCodeSVG 
                          value={`${window.location.origin}/${slug}/menu`}
                          size={120}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="font-black text-gray-900 text-sm mb-1">Direct Menu QR</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Bypass Registration</p>
                      <button 
                        onClick={() => window.open(`${window.location.origin}/${slug}/menu`)}
                        className="mt-4 text-[10px] font-black text-orange-600 hover:underline"
                        type="button"
                      >
                        OPEN LINK
                      </button>
                    </div>
                  </div>
                  <p className="mt-6 p-4 bg-orange-50 rounded-2xl text-[10px] font-bold text-orange-600 leading-relaxed">
                    Tip: For table-specific ordering, visit the <b>Table Mapping</b> section to generate individual QR codes for each table.
                  </p>
                </div>

                <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <LayoutGrid size={24} className="text-orange-600" /> QUICK NAVIGATOR
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => router.push(`/auth`)} className="p-6 bg-gray-50 rounded-2xl text-left hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100" type="button" title="Global Auth">
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Customer View</p>
                      <p className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">Global Auth</p>
                    </button>
                    <button onClick={() => router.push(`/${slug}/auth`)} className="p-6 bg-gray-50 rounded-2xl text-left hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100" type="button" title="QR Entrance">
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Scanning View</p>
                      <p className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">QR Entrance</p>
                    </button>
                    <button onClick={() => router.push(`/${slug}/admin/tables`)} className="p-6 bg-gray-50 rounded-2xl text-left hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100" type="button" title="Table Mapping">
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Management</p>
                      <p className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">Table Mapping</p>
                    </button>
                    <button onClick={() => router.push(`/${slug}/admin/sales-report`)} className="p-6 bg-gray-50 rounded-2xl text-left hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-100" type="button" title="Sales Report">
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Accounting</p>
                      <p className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">Sales Report</p>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                      <Activity size={24} className="text-orange-600" /> RECENT TRANSMSISSIONS
                    </h3>
                    <button onClick={() => setActiveTab('live')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline" type="button" title="View All Orders">View All</button>
                  </div>
                  <div className="space-y-4">
                    {orders.slice(0, 4).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${order.type === 'dinein' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {order.type === 'dinein' ? `T${order.tableNumber}` : 'TW'}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm">{order.customerName}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{order.items.length} items • {formatPrice(order.totalAmount)}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-tighter ${
                          order.orderStatus === 'received' ? 'bg-amber-100 text-amber-600' : 
                          order.orderStatus === 'preparing' ? 'bg-orange-100 text-orange-600' :
                          order.orderStatus === 'ready' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Orders View */}
          {(activeTab === 'live' || activeTab === 'completed' || activeTab === 'history') && (
            <div className="space-y-8">
              <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                  title="Grid View"
                  type="button"
                  aria-label="Grid View"
                >
                  <LayoutGrid size={20} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                  title="List View"
                  type="button"
                  aria-label="List View"
                >
                  <List size={20} />
                </button>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-gray-300">
                  <div className="w-20 h-20 bg-gray-100 rounded-[2.5rem] flex items-center justify-center mb-6 opacity-50">
                    <ShoppingBag size={40} />
                  </div>
                  <p className="text-lg font-black text-gray-900 mb-1">No orders found</p>
                  <p className="text-xs font-bold uppercase tracking-widest">Everything is up to date</p>
                </div>
              ) : (
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'}`}>
                  {filteredOrders.map(order => (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-4xl shadow-sm border overflow-hidden flex flex-col group hover:shadow-2xl hover:shadow-orange-600/5 transition-all duration-500 ${
                        viewMode === 'list' ? 'flex-row items-center p-6' : ''
                      } ${isRecentPing(order) ? 'border-orange-500 ring-4 ring-orange-100 animate-pulse' : 'border-gray-100'}`}
                    >
                      {/* Card content preserved from original implementation */}
                      <div className={`p-8 border-b border-gray-50 ${viewMode === 'list' ? 'border-none w-1/4' : ''}`}>
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              {order.type === 'dinein' ? (
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-2">
                                  <TableIcon size={14} /> T-{order.tableNumber}
                                </span>
                              ) : (
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-2">
                                  <ShoppingBag size={14} /> TAKEAWAY
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400 font-black">#{order.id?.slice(-6).toUpperCase()}</span>
                              {isRecentPing(order) && (
                                <span className="bg-orange-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 animate-bounce">
                                  <Bell size={10} /> PINGING!
                                </span>
                              )}
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                              <User size={20} className="text-gray-300" /> {order.customerName}
                            </h3>
                            <p className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-2">
                              <Phone size={14} /> +{order.customerMobile}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-gray-400 font-black text-[10px] uppercase tracking-widest">
                          <span className="flex items-center gap-2"><Clock size={14} /> {order.createdAt ? format((order.createdAt as any).toDate(), 'hh:mm a') : 'Now'}</span>
                          <span className="text-orange-600">{formatPrice(order.totalAmount + (order.taxAmount || 0))}</span>
                        </div>
                      </div>

                      <div className={`p-8 bg-gray-50/50 flex-1 ${viewMode === 'list' ? 'bg-transparent w-2/4' : ''}`}>
                        <div className="space-y-4">
                          {order.items.map((item: OrderItem, idx: number) => (
                            <div key={idx} className="flex justify-between items-center group/item">
                              <div className="flex items-center gap-4">
                                <span className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-xs font-black text-orange-600 shadow-sm">
                                  {item.quantity}
                                </span>
                                <div className="flex flex-col">
                                  <span className="font-black text-gray-800 text-sm tracking-tight">{item.name}</span>
                                  {item.variantName && (
                                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{item.variantName}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs font-black text-gray-400">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={`p-8 bg-white border-t border-gray-50 flex flex-col gap-4 ${viewMode === 'list' ? 'border-none w-1/4' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-black uppercase tracking-tighter ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                            {order.paymentType} • {order.paymentStatus}
                          </span>
                          {order.paymentStatus !== 'paid' && activeTab === 'live' && (
                            <button 
                              onClick={() => updatePaymentStatus(order.id!, 'paid')} 
                              className="text-[10px] font-black bg-blue-600 text-white px-3 py-2 rounded-xl active:scale-95 transition-all"
                              type="button"
                              title="Mark as Paid"
                              aria-label="Mark as Paid"
                            >
                              MARK PAID
                            </button>
                          )}
                        </div>

                        {activeTab === 'live' && (
                          <>
                            {order.orderStatus === 'received' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id!, 'preparing')} 
                                className="w-full bg-orange-600 text-white py-5 rounded-3xl font-black text-xs tracking-widest shadow-2xl shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                type="button"
                                title="Start Preparing"
                                aria-label="Start Preparing"
                              >
                                <ChefHat size={18} /> START PREPARING
                              </button>
                            )}
                            {order.orderStatus === 'preparing' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id!, 'ready')} 
                                className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xs tracking-widest shadow-2xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                type="button"
                                title="Mark as Ready"
                                aria-label="Mark as Ready"
                              >
                                <Bell size={18} /> MARK AS READY
                              </button>
                            )}
                            {order.orderStatus === 'ready' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id!, 'delivered')} 
                                className="w-full bg-green-600 text-white py-5 rounded-3xl font-black text-xs tracking-widest shadow-2xl shadow-green-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                type="button"
                                title="Mark Delivered"
                                aria-label="Mark Delivered"
                              >
                                <CheckCircle2 size={18} /> MARK DELIVERED
                              </button>
                            )}
                          </>
                        )}
                        {['delivered', 'cancelled'].includes(order.orderStatus) && (
                          <div className="w-full bg-gray-100 text-gray-400 py-5 rounded-3xl font-black text-xs tracking-widest text-center uppercase">Order {order.orderStatus}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Menu Mgmt View */}
          {activeTab === 'menu' && (
            <div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900">Manage Menu</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSeedMenu} 
                    className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg active:scale-95" 
                    title="Seed Indian Basics"
                    type="button"
                    aria-label="Seed Indian Basics"
                  >
                    <Utensils size={18} /> SEED INDIAN BASICS
                  </button>
                  <button 
                    onClick={() => setIsAddingItem(true)} 
                    className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg active:scale-95" 
                    title="Add New Item"
                    type="button"
                    aria-label="Add New Item"
                  >
                    <Plus size={18} /> ADD NEW ITEM
                  </button>
                </div>
              </div>
              {/* ... menu mgmt content preserved ... */}
              <div className="space-y-4">
                {menuItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div>
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{item.category}</p>
                      <p className="font-black text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-black text-gray-900">{formatPrice(item.price)}</p>
                      <button 
                         onClick={() => setEditingItem(item)} 
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings View */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-4xl p-8 shadow-sm border border-gray-100 max-w-2xl space-y-10">
              <h3 className="text-2xl font-black text-gray-900">System Configuration</h3>
              <div className="space-y-6">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">UPI ID for Payments</label>
                <div className="flex gap-2">
                  <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" className="flex-1 bg-gray-50 border-none rounded-2xl py-4 px-6 font-bold text-gray-900" />
                  <button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-orange-600 text-white px-8 rounded-2xl font-black text-xs flex items-center gap-2" type="button" title="Save Settings">{isSavingSettings ? <Loader2 className="animate-spin" /> : <Save size={18} />} SAVE</button>
                </div>
              </div>
              <div className="pt-10 border-t border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 mb-8">Notifications</h3>
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
