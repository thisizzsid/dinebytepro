"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/lib/restaurant-context";
import { getTables, addTable, updateTable, deleteTable, onTablesUpdate } from "@/lib/firebase/tables";
import { Table } from "@/types/models";
import TableModal from "@/components/TableModal";
import TableLayout from "@/components/TableLayout";
import AdminGuard from "@/components/AdminGuard";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  LayoutDashboard,
  ArrowRight,
  Search,
  Activity,
  LogOut,
  Bell,
  Table as TableIcon,
  ShoppingBag,
  List,
  BarChart3,
  FileText,
  Settings2,
  ChevronRight,
  MoreVertical,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useParams } from "next/navigation";

import { Timestamp } from "firebase/firestore";

import AdminSidebar from "@/components/AdminSidebar";

export default function TableManagementPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant } = useRestaurant();
  const [tables, setTables] = useState<Table[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'occupied' | 'reserved'>('all');

  useEffect(() => {
    if (restaurant) {
      const unsubscribe = onTablesUpdate(restaurant.id, setTables);
      return () => unsubscribe();
    }
  }, [restaurant]);

  const handleAddTable = () => {
    setSelectedTable(null);
    setIsModalOpen(true);
  };

  const handleEditTable = (table: Table) => {
    setSelectedTable(table);
    setIsModalOpen(true);
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm("Are you sure you want to delete this table?")) return;
    if (restaurant) {
      await deleteTable(restaurant.id, tableId);
    }
  };

  const handleSaveTable = async (tableData: Omit<Table, "id">) => {
    if (restaurant) {
      if (selectedTable) {
        await updateTable(restaurant.id, selectedTable.id!, tableData);
      } else {
        await addTable(restaurant.id, tableData);
      }
      setIsModalOpen(false);
    }
  };

  const handleToggleAvailability = async (table: Table) => {
    if (restaurant) {
      const now = Timestamp.now();
      const updatedFields: Partial<Table> = {
        isAvailable: !table.isAvailable,
      };
      if (updatedFields.isAvailable) {
        updatedFields.vacatedAt = now;
        updatedFields.currentPartySize = 0;
      } else {
        updatedFields.occupiedAt = now;
      }
      await updateTable(restaurant.id, table.id!, updatedFields);
    }
  };

  const handleToggleReserved = async (table: Table) => {
    if (restaurant) {
      const updatedFields: Partial<Table> = {
        reserved: !table.reserved,
      };
      await updateTable(restaurant.id, table.id!, updatedFields);
    }
  };

  const filteredTables = tables.filter(t => {
    const matchesSearch = t.tableNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      activeFilter === 'all' ? true :
      activeFilter === 'available' ? t.isAvailable :
      activeFilter === 'occupied' ? !t.isAvailable :
      activeFilter === 'reserved' ? t.reserved : true;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.isAvailable).length,
    occupied: tables.filter(t => !t.isAvailable).length,
    reserved: tables.filter(t => t.reserved).length
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
                <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Table Mapping</h2>
                <div className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                  <span className="flex items-center gap-2"><Calendar size={16} /> {format(new Date(), 'EEEE, MMM do')}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span className="flex items-center gap-2 text-orange-600"><TableIcon size={16} /> {stats.total} Total Tables</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="Search table number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border-none rounded-2xl py-3 pl-12 pr-6 text-sm font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-orange-600 min-w-75"
                  />
                </div>
                <button 
                  onClick={handleAddTable}
                  className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
                  type="button"
                  title="Add Table"
                >
                  <Plus size={18} /> ADD TABLE
                </button>
              </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`p-6 rounded-4xl border transition-all text-left ${activeFilter === 'all' ? 'bg-gray-900 border-gray-900 text-white shadow-xl' : 'bg-white border-gray-100 text-gray-900 shadow-sm'}`}
                type="button"
                title="Filter All"
              >
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeFilter === 'all' ? 'text-gray-400' : 'text-gray-400'}`}>Total Capacity</p>
                <p className="text-3xl font-black">{stats.total}</p>
              </button>
              <button 
                onClick={() => setActiveFilter('available')}
                className={`p-6 rounded-4xl border transition-all text-left ${activeFilter === 'available' ? 'bg-green-600 border-green-600 text-white shadow-xl' : 'bg-white border-gray-100 text-gray-900 shadow-sm'}`}
                type="button"
                title="Filter Available"
              >
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeFilter === 'available' ? 'text-green-100' : 'text-gray-400'}`}>Available</p>
                <p className="text-3xl font-black">{stats.available}</p>
              </button>
              <button 
                onClick={() => setActiveFilter('occupied')}
                className={`p-6 rounded-4xl border transition-all text-left ${activeFilter === 'occupied' ? 'bg-red-600 border-red-600 text-white shadow-xl' : 'bg-white border-gray-100 text-gray-900 shadow-sm'}`}
                type="button"
                title="Filter Occupied"
              >
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeFilter === 'occupied' ? 'text-red-100' : 'text-gray-400'}`}>Occupied</p>
                <p className="text-3xl font-black">{stats.occupied}</p>
              </button>
              <button 
                onClick={() => setActiveFilter('reserved')}
                className={`p-6 rounded-4xl border transition-all text-left ${activeFilter === 'reserved' ? 'bg-amber-500 border-amber-500 text-white shadow-xl' : 'bg-white border-gray-100 text-gray-900 shadow-sm'}`}
                type="button"
                title="Filter Reserved"
              >
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeFilter === 'reserved' ? 'text-amber-100' : 'text-gray-400'}`}>Reserved</p>
                <p className="text-3xl font-black">{stats.reserved}</p>
              </button>
            </div>

            {/* Table Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 mb-12">
              {filteredTables.map((table) => (
                <div 
                  key={table.id} 
                  className={`bg-white rounded-4xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group hover:shadow-2xl hover:shadow-orange-600/5 transition-all duration-500 relative ${!table.isAvailable ? 'ring-2 ring-red-100' : table.reserved ? 'ring-2 ring-amber-100' : ''}`}
                >
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black ${!table.isAvailable ? 'bg-red-100 text-red-600' : table.reserved ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                        {table.tableNumber}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditTable(table)} className="p-2 text-gray-300 hover:text-blue-500 transition-colors" title="Edit Table" type="button" aria-label="Edit Table"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteTable(table.id!)} className="p-2 text-gray-300 hover:text-red-500 transition-colors" title="Delete Table" type="button" aria-label="Delete Table"><Trash2 size={18} /></button>
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacity</span>
                        <span className="text-sm font-black text-gray-900 flex items-center gap-2"><Users size={14} className="text-gray-300" /> {table.capacity} Seats</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${!table.isAvailable ? 'bg-red-100 text-red-600' : table.reserved ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                          {!table.isAvailable ? 'Occupied' : table.reserved ? 'Reserved' : 'Available'}
                        </span>
                      </div>
                      {!table.isAvailable && table.occupiedAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Occupied Since</span>
                          <span className="text-xs font-bold text-gray-900 flex items-center gap-2"><Clock size={14} className="text-gray-300" /> {format(table.occupiedAt.toDate(), 'hh:mm a')}</span>
                        </div>
                      )}
                      {table.currentPartySize ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Party</span>
                          <span className="text-xs font-bold text-orange-600">{table.currentPartySize} Diners</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleToggleAvailability(table)}
                        className={`py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${table.isAvailable ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/10' : 'bg-green-600 text-white shadow-lg shadow-green-600/10'}`}
                        type="button"
                        title={table.isAvailable ? 'Mark Occupied' : 'Clear Table'}
                      >
                        {table.isAvailable ? 'Mark Occupied' : 'Clear Table'}
                      </button>
                      <button 
                        onClick={() => handleToggleReserved(table)}
                        className={`py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${table.reserved ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/10' : 'bg-white border-gray-100 text-gray-400 hover:border-amber-200 hover:text-amber-600'}`}
                        type="button"
                        title={table.reserved ? 'Unreserve' : 'Reserve'}
                      >
                        {table.reserved ? 'Unreserve' : 'Reserve'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Floor Plan */}
            <div className="bg-white rounded-4xl p-10 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                  <LayoutDashboard size={24} className="text-orange-600" /> VISUAL FLOOR PLAN
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase">Occupied</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase">Reserved</span>
                  </div>
                </div>
              </div>
              <TableLayout tables={tables} />
            </div>
          </div>
        </main>

        <TableModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTable}
          table={selectedTable}
        />
      </div>
    </AdminGuard>
  );
}
