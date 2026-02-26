"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/lib/restaurant-context";
import { getTables } from "@/lib/firebase/tables";
import { createReservation, getReservations } from "@/lib/firebase/reservations";
import { Table } from "@/types/models";
import { Timestamp } from "firebase/firestore";

export default function ReservationsPage() {
  const { restaurant } = useRestaurant();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [tables, setTables] = useState<Table[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      getTables(restaurant.id).then(setTables);
    }
  }, [restaurant]);

  const handleFindTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!restaurant) return;

    const dateTime = new Date(`${date}T${time}`);
    const reservations = await getReservations(restaurant.id, dateTime);

    const availableTables = tables.filter((table) => {
      if (table.capacity < partySize) return false;
      const isReserved = reservations.some(
        (res) =>
          res.tableId === table.id &&
          Math.abs(res.dateTime.toMillis() - dateTime.getTime()) <
            2 * 60 * 60 * 1000 // 2 hours window
      );
      return !isReserved;
    });

    if (availableTables.length === 0) {
      setMessage("No available tables for the selected time and party size.");
      return;
    }

    const tableToBook = availableTables[0];

    // This is a placeholder for customer info. In a real app, you'd get this from the logged-in user.
    const customerInfo = {
      customerId: "placeholder-customer-id",
      customerName: "Placeholder Name",
      customerMobile: "1234567890",
    };

    await createReservation(restaurant.id, {
      ...customerInfo,
      tableId: tableToBook.id!,
      tableNumber: tableToBook.tableNumber,
      dateTime: Timestamp.fromDate(dateTime),
      partySize,
    });

    setMessage(`Table ${tableToBook.tableNumber} booked successfully!`);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Book a Table</h1>
      <p className="text-gray-500">Restaurant: {restaurant?.slug}</p>

      <div className="mt-4">
        <form onSubmit={handleFindTable} className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium">
              Time
            </label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="partySize" className="block text-sm font-medium">
              Party Size
            </label>
            <input
              type="number"
              id="partySize"
              value={partySize}
              onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
              min="1"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md"
          >
            Find a Table
          </button>
        </form>
        {message && <p className="mt-4 text-center">{message}</p>}
      </div>
    </div>
  );
}
