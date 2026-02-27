"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/lib/restaurant-context";
import { getTables } from "@/lib/firebase/tables";
import { Table } from "@/types/models";
import AdminGuard from "@/components/AdminGuard";
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  LayoutDashboard, 
  Activity, 
  Table as TableIcon, 
  List, 
  FileText, 
  Settings2, 
  LogOut,
  Timer,
  Users,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useParams } from "next/navigation";

export default function AnalyticsPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant } = useRestaurant();
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    if (restaurant) {
      getTables(restaurant.id).then(setTables);
    }
  }, [restaurant]);

  const calculateTurnover = () => {
    return tables.map((table) => {
      if (table.occupiedAt && table.vacatedAt) {
        const occupiedTime =
          table.vacatedAt.toMillis() - table.occupiedAt.toMillis();
        return {
          tableNumber: table.tableNumber,
          occupiedTime: occupiedTime / (1000 * 60), // in minutes
          capacity: table.capacity
        };
      }
      return null;
    }).filter(t => t !== null);
  };

  interface TurnoverEntry {
    tableNumber: string;
    occupiedTime: number;
    capacity: number;
  }
  const turnoverData = calculateTurnover() as TurnoverEntry[];
  const avgTurnover = turnoverData.length > 0 
    ? turnoverData.reduce((sum, d) => sum + d.occupiedTime, 0) / turnoverData.length 
    : 0;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-72 bg-gray-900 flex-col h-screen sticky top-0">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 overflow-hidden">
                <img src="/moclogo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-xl font-black text-white leading-tight tracking-tight">DineByte</h1>
            </div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] ml-1">Restaurant Management</p>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            <p className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 mt-4">Main</p>
            <button 
              onClick={() => router.push(`/${slug}/admin`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              type="button"
              title="Dashboard"
              aria-label="Dashboard"
            >
              <LayoutDashboard size={20} /> DASHBOARD
            </button>
            <button 
              onClick={() => router.push(`/${slug}/admin`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              type="button"
              title="Live Orders"
              aria-label="Live Orders"
            >
              <Activity size={20} /> LIVE ORDERS
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
              onClick={() => router.push(`/${slug}/admin`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
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
              <FileText size={20} /> DIGITAL BILLS
            </button>
            <button 
              onClick={() => router.push(`/${slug}/admin/invoice-settings`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              type="button"
              title="Billing Config"
              aria-label="Billing Config"
            >
              <Settings2 size={20} /> BILLING CONFIG
            </button>
            <button 
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 transition-all"
              type="button"
              title="Turnover Insights"
              aria-label="Turnover Insights"
            >
              <Timer size={20} /> TURNOVER INSIGHTS
            </button>

            <p className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 mt-8">System</p>
            <button 
              onClick={() => router.push(`/${slug}/admin`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
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
                  onClick={() => {
                    sessionStorage.removeItem("moc_admin_auth");
                    router.push(`/${slug}/admin`);
                  }}
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 lg:p-12 max-w-300 mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Efficiency Insights</h2>
                <div className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                  <span className="flex items-center gap-2"><Calendar size={16} /> {format(new Date(), 'EEEE, MMM do')}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span className="flex items-center gap-2 text-indigo-600"><Timer size={16} /> Table Turnover</span>
                </div>
              </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Avg. Occupation</p>
                <p className="text-3xl font-black text-gray-900">{avgTurnover.toFixed(1)} <span className="text-sm text-gray-400 font-bold">mins</span></p>
              </div>
              <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total Sessions</p>
                <p className="text-3xl font-black text-gray-900">{turnoverData.length}</p>
              </div>
              <div className="bg-indigo-600 p-8 rounded-4xl shadow-xl shadow-indigo-600/20 text-white">
                <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-1">Efficiency Rating</p>
                <p className="text-3xl font-black">Optimal</p>
              </div>
            </div>

            {/* Turnover Table */}
            <div className="bg-white rounded-4xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 uppercase">Turnover Logs</h3>
                <Activity size={20} className="text-indigo-600" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Table</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacity</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {turnoverData.length > 0 ? turnoverData.map((data, index) => (
                      <tr key={index} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <span className="text-sm font-black text-gray-900 uppercase">Table {data.tableNumber}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                            <Users size={14} /> {data.capacity} seats
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-black text-indigo-600">{data.occupiedTime.toFixed(1)} mins</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-black bg-green-100 text-green-600 px-2 py-1 rounded-md uppercase">Completed</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <TrendingUp size={16} className="text-green-500 ml-auto" />
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <AlertCircle size={32} className="text-gray-300" />
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No turnover data available yet</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
