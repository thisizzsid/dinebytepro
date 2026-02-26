"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/lib/restaurant-context";
import { getOrders } from "../../../../lib/firebase/orders";
import { Order } from "@/types/models";
import { getInvoiceSettings, InvoiceSettings } from "@/lib/firebase/settings";
import Invoice from "@/components/Invoice";
import AdminGuard from "@/components/AdminGuard";
import { 
  FileText, 
  Printer, 
  X, 
  Search, 
  Calendar, 
  LayoutDashboard, 
  Activity, 
  Table as TableIcon, 
  List, 
  BarChart3, 
  Settings2, 
  LogOut,
  ChevronRight,
  ShoppingBag,
  User,
  IndianRupee,
  Clock,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";

export default function InvoicesPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (restaurant) {
      getOrders(restaurant.id).then(setOrders);
      getInvoiceSettings(restaurant.id).then(setInvoiceSettings);
    }
  }, [restaurant]);

  const handleGenerateInvoice = (order: Order) => {
    setSelectedOrder(order);
  };

  const handlePrint = () => {
    const printContents = document.getElementById("invoice")!.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm bg-orange-600 text-white shadow-lg shadow-orange-600/20 transition-all"
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
              onClick={() => router.push(`/${slug}/admin/analytics`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              type="button"
              title="Turnover Insights"
              aria-label="Turnover Insights"
            >
              <Clock size={20} /> TURNOVER INSIGHTS
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
          <div className="p-8 lg:p-12 max-w-400 mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Invoices</h2>
                <div className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                  <span className="flex items-center gap-2"><Calendar size={16} /> {format(new Date(), 'EEEE, MMM do')}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span className="flex items-center gap-2 text-green-600"><FileText size={16} /> Digital Billing</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="Search by ID or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border-none rounded-2xl py-3 pl-12 pr-6 text-sm font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-orange-600 min-w-75"
                  />
                </div>
              </div>
            </header>

            {/* Invoices Table */}
            <div className="bg-white rounded-4xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50">
                <h3 className="text-xl font-black text-gray-900 uppercase">Recent Bills</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bill ID</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
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
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                              {order.customerName.charAt(0)}
                            </div>
                            <span className="text-sm font-black text-gray-900">{order.customerName}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-black text-gray-900">{formatPrice(order.totalAmount)}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${order.type === 'dinein' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {order.type}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-gray-900">{format(order.createdAt.toDate(), 'MMM dd')}</span>
                            <span className="text-[10px] font-bold text-gray-400">{format(order.createdAt.toDate(), 'hh:mm a')}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => handleGenerateInvoice(order)}
                            className="bg-gray-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg active:scale-95"
                            type="button"
                            title="Generate Bill"
                          >
                            Generate Bill
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No orders found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        {/* Invoice Modal */}
        {selectedOrder && invoiceSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
            <div className="relative bg-white rounded-4xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 uppercase">Print Preview</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="absolute top-8 right-8 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Close Preview"
                  type="button"
                  aria-label="Close Preview"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                <div id="invoice" className="bg-white shadow-sm p-8 max-w-md mx-auto rounded-xl border border-gray-100">
                  <Invoice order={selectedOrder} settings={invoiceSettings} />
                </div>
              </div>

              <div className="p-8 bg-white border-t border-gray-100 flex justify-end gap-4">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-3 rounded-2xl font-black text-xs uppercase text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-orange-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
                >
                  <Printer size={18} /> Print Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
