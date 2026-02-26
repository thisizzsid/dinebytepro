"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRestaurant } from "@/lib/restaurant-context";
import { useTable } from "@/lib/table-context";
import { getTables, updateTable } from "@/lib/firebase/tables";
import { Table } from "@/types/models";
import { Timestamp } from "firebase/firestore";

export default function TablePage() {
  const { restaurant } = useRestaurant();
  const { setTableNumber, setNumberOfDiners } = useTable();
  const [localTableNumber, setLocalTableNumber] = useState("");
  const [localNumberOfDiners, setLocalNumberOfDiners] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (restaurant) {
      getTables(restaurant.id).then(setTables);
    }
  }, [restaurant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const table = tables.find(
      (t) => t.tableNumber === localTableNumber && t.isAvailable
    );

    if (!table) {
      setError("Invalid or unavailable table number.");
      return;
    }

    try {
      if (!restaurant) return;
      await updateTable(restaurant.id, table.id!, {
        isAvailable: false,
        occupiedAt: Timestamp.now(),
        currentPartySize: localNumberOfDiners,
      });
      setTableNumber(localTableNumber);
      setNumberOfDiners(localNumberOfDiners);
    } catch {
      setError("Failed to set table occupied. Please try again.");
      return;
    }

    if (restaurant) {
      router.push(`/${restaurant.slug}/menu`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 className="mb-4 text-2xl font-bold text-center">
          Welcome to {restaurant?.slug}
        </h1>
        <form onSubmit={handleSubmit}>
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
              value={localTableNumber}
              onChange={(e) => setLocalTableNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-200"
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="numberOfDiners"
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              Number of Diners
            </label>
            <input
              type="number"
              id="numberOfDiners"
              value={localNumberOfDiners}
              onChange={(e) => setLocalNumberOfDiners(parseInt(e.target.value, 10))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-200"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Proceed to Menu
          </button>
          {error && <p className="mt-4 text-sm text-center text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}
