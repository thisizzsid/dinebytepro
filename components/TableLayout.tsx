"use client";

import { Table } from "@/types/models";

interface TableLayoutProps {
  tables: Table[];
}

export default function TableLayout({ tables }: TableLayoutProps) {
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="mb-4 text-xl font-bold">Table Layout</h2>
      <div className="grid grid-cols-4 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`flex items-center justify-center h-24 rounded-lg ${
              table.reserved ? "bg-amber-300" : table.isAvailable ? "bg-green-300" : "bg-red-300"
            }`}
          >
            <div className="text-center">
              <p className="font-bold">{table.tableNumber}</p>
              <p className="text-sm">({table.capacity} seats)</p>
              {table.currentPartySize ? (
                <p className="text-xs text-gray-700">Party: {table.currentPartySize}</p>
              ) : null}
              {table.reserved ? (
                <p className="text-xs text-gray-700">Reserved</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
