"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useRestaurant } from "@/lib/restaurant-context";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { 
  LayoutDashboard, 
  Activity, 
  Clock, 
  Table as TableIcon, 
  List, 
  BarChart3, 
  CreditCard, 
  FileText, 
  Settings2, 
  LogOut,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSidebar() {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { restaurant, liveOrderCount } = useRestaurant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    sessionStorage.removeItem(`dinebyte_auth_${slug}`);
    try {
      await signOut(auth);
      router.push(`/${slug}/admin`);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItems = [
    {
      section: "MAIN CONTROL",
      items: [
        { label: "DASHBOARD", icon: LayoutDashboard, href: `/${slug}/admin`, id: 'dashboard' },
        { label: "LIVE ORDERS", icon: Activity, href: `/${slug}/admin?tab=live`, id: 'live', count: liveOrderCount },
        { label: "ORDER HISTORY", icon: Clock, href: `/${slug}/admin?tab=history`, id: 'history' },
      ]
    },
    {
      section: "OPERATIONS",
      items: [
        { label: "TABLE MAPPING", icon: TableIcon, href: `/${slug}/admin/tables`, id: 'tables' },
        { label: "MENU CATALOG", icon: List, href: `/${slug}/admin?tab=menu`, id: 'menu' },
      ]
    },
    {
      section: "INTELLIGENCE",
      items: [
        { label: "SALES ANALYTICS", icon: BarChart3, href: `/${slug}/admin/sales-report`, id: 'sales' },
        { label: "DIGITAL BILLS", icon: CreditCard, href: `/${slug}/admin/invoices`, id: 'invoices' },
        { label: "BILLING CONFIG", icon: FileText, href: `/${slug}/admin/invoice-settings`, id: 'billing' },
      ]
    },
    {
      section: "SYSTEM",
      items: [
        { label: "SETTINGS", icon: Settings2, href: `/${slug}/admin?tab=settings`, id: 'settings' },
      ]
    }
  ];

  const isActive = (item: any) => {
    const currentTab = new URLSearchParams(window.location.search).get('tab');
    
    // If it's a direct route link (like /tables)
    if (!item.href.includes('?tab=')) {
      return pathname === item.href;
    }

    // If it's a tab link (like ?tab=live)
    const itemTab = item.href.split('?tab=')[1];
    const isDashboardBase = pathname === `/${slug}/admin`;
    
    if (itemTab === 'dashboard') {
      return isDashboardBase && (!currentTab || currentTab === 'dashboard');
    }
    
    return isDashboardBase && currentTab === itemTab;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-8">
        <Link href={`/${slug}/admin`} className="flex items-center gap-4 mb-2 group cursor-pointer">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1.5 overflow-hidden shadow-2xl shadow-orange-600/20 rotate-3 group-hover:rotate-0 transition-all duration-500 border-2 border-orange-50/10">
            <img src="/moclogo.png" alt="DineByte Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white leading-tight tracking-tighter group-hover:text-orange-500 transition-colors">DineByte</h1>
            <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.2em] animate-pulse">Command Center</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar py-4">
        {navItems.map((section) => (
          <div key={section.section} className="mb-8">
            <div className="px-4 mb-4">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] opacity-50 flex items-center gap-2">
                <div className={`w-1 h-1 rounded-full ${
                  section.section === 'MAIN CONTROL' ? 'bg-orange-500' :
                  section.section === 'OPERATIONS' ? 'bg-blue-500' :
                  section.section === 'INTELLIGENCE' ? 'bg-purple-500' : 'bg-gray-400'
                }`} /> {section.section}
              </div>
            </div>
            
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const active = isActive(item);
                return (
                  <Link 
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs transition-all duration-500 relative group overflow-hidden ${
                      active 
                        ? 'bg-orange-600 text-white shadow-[0_10px_30px_rgba(234,88,12,0.3)]' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon size={20} className={`${active ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} ${
                      !active && section.section === 'OPERATIONS' ? 'text-blue-500' :
                      !active && section.section === 'INTELLIGENCE' ? 'text-purple-500' : ''
                    }`} /> 
                    <span className="relative z-10">{item.label}</span>
                    {item.count !== undefined && (
                      <span className={`ml-auto px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors ${
                        active ? 'bg-white/20 border-white/20 text-white' : 'bg-orange-600/10 border-orange-600/20 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'
                      }`}>{item.count}</span>
                    )}
                    {active && <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl group hover:bg-white/10 transition-all duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-linear-to-tr from-orange-600 to-orange-400 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-orange-600/20 group-hover:scale-110 transition-transform">
              {restaurant?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate group-hover:text-orange-400 transition-colors">{restaurant?.name || 'Admin'}</p>
              <p className="text-[10px] text-gray-500 font-bold truncate tracking-widest uppercase">Cloud Node 01</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-3 text-gray-500 hover:text-white hover:bg-red-600 rounded-xl transition-all shadow-lg active:scale-95"
              title="Secure Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-80 bg-gray-900/95 backdrop-blur-2xl flex-col h-screen fixed left-0 top-0 border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.3)] z-20">
        <SidebarContent />
      </aside>

      {/* Spacer for fixed sidebar on desktop */}
      <div className="hidden lg:block w-80 shrink-0" />

      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-orange-600 text-white rounded-full shadow-2xl z-40 flex items-center justify-center active:scale-90 transition-all"
        aria-label="Open Navigation Menu"
        title="Open Navigation Menu"
      >
        <Menu size={28} />
      </button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 w-80 bg-gray-900 z-50 shadow-2xl flex flex-col"
            >
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-8 right-6 text-gray-400 hover:text-white p-2"
                aria-label="Close Navigation Menu"
                title="Close Navigation Menu"
              >
                <X size={24} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
