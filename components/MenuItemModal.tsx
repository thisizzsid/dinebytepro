"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, AlertCircle, CheckCircle2, Plus, Trash2, Scale } from "lucide-react";

interface RecipeIngredient {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unit: string;
}

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
  inventoryItems?: any[]; // Added inventory items for recipe selection
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
  inventoryItems = [],
}: MenuItemModalProps) {
  const [showRecipe, setShowRecipe] = useState(false);

  const addIngredient = () => {
    const ingredients = newItem.ingredients || [];
    setNewItem({
      ...newItem,
      ingredients: [...ingredients, { inventoryItemId: "", name: "", quantity: 0, unit: "kg" }]
    });
  };

  const removeIngredient = (index: number) => {
    const ingredients = [...(newItem.ingredients || [])];
    ingredients.splice(index, 1);
    setNewItem({ ...newItem, ingredients });
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const ingredients = [...(newItem.ingredients || [])];
    if (field === 'inventoryItemId') {
      const selectedItem = inventoryItems.find(item => item.id === value);
      ingredients[index] = {
        ...ingredients[index],
        inventoryItemId: value,
        name: selectedItem?.name || "",
        unit: selectedItem?.unit || "kg"
      };
    } else {
      ingredients[index] = { ...ingredients[index], [field]: value };
    }
    setNewItem({ ...newItem, ingredients });
  };

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl p-8 shadow-2xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-gray-900">
                {isEditing ? "Edit Item" : "Add New Item"}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                type="button"
                title="Close Modal"
                aria-label="Close Modal"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    title="Select Category"
                    aria-label="Select Category"
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
                    Dish Type
                  </label>
                  <div className="flex gap-3">
                    {[
                      { id: "veg", label: "Veg", color: "bg-green-500" },
                      { id: "non-veg", label: "Non-Veg", color: "bg-red-500" },
                      { id: "egg", label: "Egg", color: "bg-yellow-500" }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setNewItem({ ...newItem, type: type.id })}
                        className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all border-2 flex items-center justify-center gap-2 ${
                          newItem.type === type.id 
                            ? "bg-gray-900 border-gray-900 text-white" 
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${type.color}`} />
                        {type.label}
                      </button>
                    ))}
                  </div>
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
              </div>

              {/* Recipe / Ingredients Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">
                    Recipe / Ingredients
                  </label>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                  >
                    <Plus size={14} /> Add Ingredient
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(newItem.ingredients || []).length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                      <Scale className="text-gray-300 mx-auto mb-3" size={32} />
                      <p className="text-xs font-bold text-gray-400">No ingredients added.<br/>Add them for auto-stock deduction.</p>
                    </div>
                  ) : (
                    (newItem.ingredients || []).map((ing: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <select
                            value={ing.inventoryItemId}
                            onChange={(e) => updateIngredient(index, 'inventoryItemId', e.target.value)}
                            className="flex-1 bg-white border-2 border-transparent rounded-xl py-2 px-3 text-xs font-bold text-gray-900 focus:border-orange-600 outline-none"
                            title="Select Ingredient"
                          >
                            <option value="">Select Ingredient</option>
                            {inventoryItems.map(item => (
                              <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove Ingredient"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 relative">
                            <input
                              type="number"
                              value={ing.quantity || ""}
                              onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                              placeholder="Quantity"
                              className="w-full bg-white border-2 border-transparent rounded-xl py-2 px-3 text-xs font-bold text-gray-900 focus:border-orange-600 outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">
                              {ing.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-8 mt-8 border-t border-gray-100">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-orange-600 text-white hover:bg-orange-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-600/20"
                type="button"
              >
                <Save size={18} /> {isEditing ? "Update" : "Add"} Item
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

