"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface MenuItemModalProps {
  isOpen: boolean;
  isEditing?: boolean;
  item?: any;
  categories: string[];
  onSave: () => void;
  onClose: () => void;
  newItem: any;
  setNewItem: (item: any) => void;
  error?: string;
  success?: string;
}

export default function MenuItemModal({
  isOpen,
  isEditing,
  categories,
  onSave,
  onClose,
  newItem,
  setNewItem,
  error,
  success,
}: MenuItemModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl p-8 shadow-2xl z-50 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-gray-900">
                {isEditing ? "Edit Item" : "Add New Item"}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3"
              >
                <AlertCircle className="text-red-600" size={18} />
                <p className="text-sm font-bold text-red-600">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3"
              >
                <CheckCircle2 className="text-green-600" size={18} />
                <p className="text-sm font-bold text-green-600">{success}</p>
              </motion.div>
            )}

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., Masala Chai"
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3 px-4 font-bold text-gray-900 focus:ring-0 focus:border-orange-600 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                  Category
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3 px-4 font-bold text-gray-900 focus:ring-0 focus:border-orange-600 transition-all"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="e.g., Strong tea with aromatic spices"
                  rows={3}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3 px-4 font-bold text-gray-900 focus:ring-0 focus:border-orange-600 transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  value={newItem.price || ""}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="e.g., 40"
                  min={0}
                  step={0.5}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3 px-4 font-bold text-gray-900 focus:ring-0 focus:border-orange-600 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl font-black text-sm bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  className="flex-1 py-3 rounded-2xl font-black text-sm bg-orange-600 text-white hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                  type="button"
                >
                  <Save size={16} /> {isEditing ? "Update" : "Add"} Item
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
