"use client";

import { Table } from "@/types/models";
import { useState, useEffect } from "react";

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
  const [capacity, setCapacity] = useState(1);

  useEffect(() => {
    if (table) {
      setTableNumber(table.tableNumber);
      setCapacity(table.capacity);
    } else {
      setTableNumber("");
      setCapacity(1);
    }
  }, [table]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      tableNumber,
      capacity,
      isAvailable: table?.isAvailable ?? true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-96">
        <h2 className="mb-4 text-xl font-bold">
          {table ? "Edit Table" : "Add Table"}
        </h2>
        <div className="mb-4">
          <label
            htmlFor="tableNumber"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            Table Number
          </label>
          <input
            type="text"
            id="tableNumber"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="mb-6">
          <label
            htmlFor="capacity"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            Capacity
          </label>
          <input
            type="number"
            id="capacity"
            value={capacity || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                setCapacity(0);
              } else {
                const num = parseInt(val, 10);
                setCapacity(isNaN(num) ? 0 : num);
              }
            }}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
