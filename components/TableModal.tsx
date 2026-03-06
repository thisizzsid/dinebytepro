"use client";

import { Table } from "@/types/models";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Users, Hash } from "lucide-react";

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (table: Omit<Table, "id">) => void;
  table: Table | null;
}

export default function TableModal({
  isOpen,
  onClose,
  onSave,
  table,
}: TableModalProps) {
  const [tableNumber, setTableNumber] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [qrText, setQrText] = useState("");
  const [wifiSpeed, setWifiSpeed] = useState("");

  useEffect(() => {
    if (table) {
      setTableNumber(table.tableNumber);
      setCapacity(table.capacity);
      setQrText(table.qrText || "");
      setWifiSpeed(table.wifiSpeed || "");
    } else {
      setTableNumber("");
      setCapacity(4);
      setQrText("");
      setWifiSpeed("");
    }
  }, [table]);

  const handleSave = () => {
    if (!tableNumber) return;
    onSave({
      tableNumber,
      capacity,
      isAvailable: table?.isAvailable ?? true,
      reserved: table?.reserved ?? false,
      currentPartySize: table?.currentPartySize ?? 0,
      occupiedAt: table?.occupiedAt ?? undefined,
      vacatedAt: table?.vacatedAt ?? undefined,
      qrText: qrText || undefined,
      wifiSpeed: wifiSpeed || undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                  {table ? "Update Table" : "New Table"}
                </h2>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Configure Seating Node</p>
              </div>
              <button 
                onClick={onClose}
                title="Close"
                className="p-3 bg-white text-gray-400 hover:text-gray-900 rounded-2xl shadow-sm transition-colors border border-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Table Number */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Hash size={12} /> Table Reference Number
                </label>
                <input
                  autoFocus
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. 12 or A1"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 focus:bg-white rounded-2xl py-4 px-6 text-gray-900 font-black transition-all outline-none"
                />
              </div>

              {/* Capacity Selector */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Users size={12} /> Seating Capacity
                </label>
                
                <div className="grid grid-cols-4 gap-3">
                  {[2, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCapacity(num)}
                      className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                        capacity === num 
                          ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20" 
                          : "bg-white border-gray-100 text-gray-400 hover:border-orange-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="relative group">
                  <input
                    type="number"
                    value={capacity || ""}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                    placeholder="Custom Capacity..."
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 focus:bg-white rounded-2xl py-4 px-6 text-gray-900 font-black transition-all outline-none"
                  />
                </div>
              </div>

              {/* QR Customization */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                   QR Custom Text
                </label>
                <input
                  type="text"
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder="e.g. Scan to Order Delicious Food"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 focus:bg-white rounded-2xl py-4 px-6 text-gray-900 font-black transition-all outline-none"
                />
              </div>

              {/* WiFi Speed */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                   WiFi Speed
                </label>
                <input
                  type="text"
                  value={wifiSpeed}
                  onChange={(e) => setWifiSpeed(e.target.value)}
                  placeholder="e.g. 50 Mbps"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 focus:bg-white rounded-2xl py-4 px-6 text-gray-900 font-black transition-all outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white text-gray-400 border border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!tableNumber}
                className="flex-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-900/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Save size={18} /> {table ? "SAVE CHANGES" : "ACTIVATE TABLE"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
