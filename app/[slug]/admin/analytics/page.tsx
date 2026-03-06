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

import AdminSidebar from "@/components/AdminSidebar";

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
      <div className="min-h-screen bg-gray-50 flex overflow-hidden">
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
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
