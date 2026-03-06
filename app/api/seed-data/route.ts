import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";

const indianBasics = [
  { name: "Masala Chai", description: "Strong tea with spices", price: 40, category: "Indian Basics" },
  { name: "Ginger Chai", description: "Fresh ginger infusion", price: 45, category: "Indian Basics" },
  { name: "Adrak Elaichi Chai", description: "Ginger-cardamom blend", price: 50, category: "Indian Basics" },
  { name: "Samosa", description: "Crispy potato pastry", price: 60, category: "Indian Basics" },
  { name: "Vada Pav", description: "Spicy potato fritter in bun", price: 80, category: "Indian Basics" }
];

const defaultTables = [
  { tableNumber: "1", capacity: 4 },
  { tableNumber: "2", capacity: 4 },
  { tableNumber: "3", capacity: 2 },
  { tableNumber: "4", capacity: 6 }
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = body?.slug;
    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    // Seed menu
    const menuCol = collection(db, "restaurants", slug, "menu");
    for (const item of indianBasics) {
      await addDoc(menuCol, { ...item, isAvailable: true, createdAt: new Date() });
    }

    // Seed menu only if explicitly requested, but we'll remove table seeding to make it manual
    // For now, let's keep the menu seed if they use the button, but remove table seeding
    /*
    const tablesCol = collection(db, "restaurants", slug, "tables");
    for (const t of defaultTables) {
      await addDoc(tablesCol, { ...t, isAvailable: true, reserved: false, currentPartySize: 0 });
    }
    */

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "seed failed" }, { status: 500 });
  }
}
