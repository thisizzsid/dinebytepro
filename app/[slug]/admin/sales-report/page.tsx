"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/lib/restaurant-context";
import { getOrders } from "../../../../lib/firebase/orders";
import { Order } from "@/types/models";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AdminGuard from "@/components/AdminGuard";
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Filter, 
  ArrowLeft, 
  LayoutDashboard, 
  Activity, 
  Table as TableIcon, 
  List, 
  FileText, 
  Settings2, 
  LogOut,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronRight,
  IndianRupee,
  ShoppingBag,
  Users,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";

import AdminSidebar from "@/components/AdminSidebar";
import { motion, AnimatePresence } from "framer-motion";

export default function SalesReportPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setIsSyncing(true);
      getOrders(restaurant.id).then((allOrders) => {
        setOrders(allOrders);
        applyFilter(allOrders, startDate, endDate);
        setIsSyncing(false);
      }).catch(() => setIsSyncing(false));
    }
  }, [restaurant]);

  // Group data for the chart
  const chartData = filteredOrders.reduce((acc: any, order) => {
    const date = format(order.createdAt.toDate(), 'MMM dd');
    if (!acc[date]) acc[date] = 0;
    acc[date] += order.totalAmount;
    return acc;
  }, {});

  const chartLabels = Object.keys(chartData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const maxSales = Math.max(...Object.values(chartData) as number[], 1000);

  const applyFilter = (allOrders: Order[], startStr: string, endStr: string) => {
    if (!startStr || !endStr) {
      setFilteredOrders(allOrders);
      return;
    }
    const start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(23, 59, 59, 999);
    
    const filtered = allOrders.filter((order) => {
      const orderDate = order.createdAt.toDate();
      return orderDate >= start && orderDate <= end;
    });
    setFilteredOrders(filtered);
  };

  const handleFilter = () => {
    applyFilter(orders, startDate, endDate);
  };

  const totalSales = filteredOrders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );

  const averageOrderValue = filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0;

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      
      // Header Branding
      doc.setFillColor(249, 115, 22); // Orange-600
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("DineByte", 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Command Center - Sales Analytics", 14, 28);
      
      doc.setTextColor(255, 255, 255);
      doc.text(`Restaurant: ${restaurant?.name || restaurant?.slug?.toUpperCase()}`, 196, 20, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleString()}`, 196, 28, { align: "right" });

      doc.setTextColor(100);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`REPORT PERIOD: ${startDate} to ${endDate}`, 14, 50);

      autoTable(doc, {
        startY: 55,
        head: [["Order ID", "Customer", "Items", "Type", "Status", "Total", "Date"]],
        body: filteredOrders.map((order) => [
          order.id?.slice(-6).toUpperCase() || "N/A",
          order.customerName || "Walk-in",
          (order.items?.length || 0).toString(),
          (order.type || "N/A").toUpperCase(),
          (order.orderStatus || "N/A").toUpperCase(),
          `Rs. ${(order.totalAmount || 0).toFixed(2)}`,
          order.createdAt ? format(order.createdAt.toDate(), 'MMM dd, hh:mm a') : "N/A",
        ]),
        headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { fontSize: 9, cellPadding: 4 },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 60;
      
      // Summary Box
      doc.setFillColor(243, 244, 246);
      doc.rect(14, finalY + 10, 182, 30, 'F');
      
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(12);
      doc.text(`Total Orders: ${filteredOrders.length}`, 25, finalY + 22);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(249, 115, 22);
      doc.text(`Total Revenue: Rs. ${totalSales.toFixed(2)}`, 190, finalY + 24, { align: "right" });

      doc.save(`sales-report-${startDate}-to-${endDate}.pdf`);
    } catch (error) { 
      console.error("PDF Generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    }
    setIsGenerating(false);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 flex overflow-hidden">
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="p-8 lg:p-12 max-w-400 mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Sales Analytics</h2>
                <div className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                  <span className="flex items-center gap-2"><Calendar size={16} /> {format(new Date(), 'EEEE, MMM do')}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span className="flex items-center gap-2 text-orange-600"><TrendingUp size={16} /> Live Financials</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex flex-col px-4 py-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-xs font-black border-none bg-transparent p-0 focus:ring-0 cursor-pointer"
                      aria-label="Start Date"
                    />
                  </div>
                  <div className="w-px bg-gray-100 my-2" />
                  <div className="flex flex-col px-4 py-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-xs font-black border-none bg-transparent p-0 focus:ring-0 cursor-pointer"
                      aria-label="End Date"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleFilter}
                  className="bg-gray-900 text-white p-4 rounded-2xl hover:bg-orange-600 transition-all shadow-lg active:scale-95"
                  title="Apply Filter"
                  type="button"
                >
                  <Filter size={20} />
                </button>
                <button 
                  onClick={handleDownloadPdf}
                  disabled={isGenerating}
                  className="bg-orange-600 text-white px-6 py-4 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95 transition-all disabled:opacity-50"
                  type="button"
                  title="Export PDF"
                >
                  {isGenerating ? 'GENERATING...' : <><Download size={18} /> EXPORT PDF</>}
                </button>
              </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
              <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <IndianRupee size={80} />
                </div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Total Revenue</p>
                <p className="text-3xl font-black text-gray-900">{formatPrice(totalSales)}</p>
                <div className="mt-4 flex items-center gap-2 text-green-500 font-bold text-xs">
                  <TrendingUp size={14} /> Gross collection
                </div>
              </div>
              <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <ShoppingBag size={80} />
                </div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Orders Processed</p>
                <p className="text-3xl font-black text-gray-900">{filteredOrders.length}</p>
                <div className="mt-4 flex items-center gap-2 text-blue-500 font-bold text-xs">
                  <Activity size={14} /> Total transactions
                </div>
              </div>
              <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Users size={80} />
                </div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Avg. Order Value</p>
                <p className="text-3xl font-black text-gray-900">{formatPrice(averageOrderValue)}</p>
                <div className="mt-4 flex items-center gap-2 text-orange-500 font-bold text-xs">
                  <TrendingUp size={14} /> Per customer spend
                </div>
              </div>
              <div className="bg-gray-900 p-8 rounded-4xl shadow-xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform text-white">
                  <FileText size={80} />
                </div>
                <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-2">Net Growth</p>
                <p className="text-3xl font-black">+14.2%</p>
                <p className="mt-4 text-[10px] text-white/40 font-bold uppercase tracking-widest">VS PREVIOUS PERIOD</p>
              </div>
            </div>

            {/* Sales Performance Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 mb-12"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <BarChart3 size={24} className="text-orange-600" /> SALES PERFORMANCE
                  </h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-1">Revenue distribution by timeline</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-600 rounded-full" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue (INR)</span>
                </div>
              </div>

              <div className="relative h-64 flex items-end gap-3 md:gap-6 px-4">
                {/* Y-Axis Guideline */}
                <div className="absolute inset-x-0 top-0 border-t border-gray-50 h-full flex flex-col justify-between pointer-events-none">
                  <div className="border-t border-gray-50 w-full" />
                  <div className="border-t border-gray-50 w-full" />
                  <div className="border-t border-gray-50 w-full" />
                </div>

                {chartLabels.length > 0 ? chartLabels.map((label, idx) => {
                  const value = chartData[label];
                  const height = (value / maxSales) * 100;
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: idx * 0.05, type: "spring", stiffness: 100 }}
                        className="w-full bg-orange-600/10 hover:bg-orange-600 rounded-t-xl transition-all relative"
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-10">
                          {formatPrice(value)}
                        </div>
                      </motion.div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mt-4 -rotate-45 md:rotate-0 whitespace-nowrap">
                        {label}
                      </span>
                    </div>
                  );
                }) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-black uppercase tracking-widest text-xs opacity-50">
                    No data points available for this period
                  </div>
                )}
              </div>
            </motion.div>

            {/* Sales Table */}
            <div className="bg-white rounded-4xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 uppercase">Transaction History</h3>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by customer..." 
                    className="bg-gray-50 border-none rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-orange-600 min-w-50"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                      <tr key={order.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <span className="text-xs font-black text-gray-400 group-hover:text-gray-900 transition-colors">#{order.id?.slice(-6).toUpperCase()}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                              {order.customerName.charAt(0)}
                            </div>
                            <span className="text-sm font-black text-gray-900">{order.customerName}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-gray-500">{order.items.length} items</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${order.type === 'dinein' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {order.type}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-gray-900">{format(order.createdAt.toDate(), 'MMM dd, yyyy')}</span>
                            <span className="text-[10px] font-bold text-gray-400">{format(order.createdAt.toDate(), 'hh:mm a')}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-black text-gray-900">{formatPrice(order.totalAmount)}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button className="p-2 text-gray-300 hover:text-orange-600 transition-colors" title="View Details">
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                              <Search size={32} />
                            </div>
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No orders found for this period</p>
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
