import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";
import { Table } from "@/types/models";

const getTablesCollection = (restaurantId: string) =>
  collection(db, "restaurants", restaurantId, "tables");

export async function getTables(restaurantId: string): Promise<Table[]> {
  const tablesCollection = getTablesCollection(restaurantId);
  const q = query(tablesCollection);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Table[];
}

export async function addTable(
  restaurantId: string,
  table: Omit<Table, "id">
): Promise<Table> {
  const tablesCollection = getTablesCollection(restaurantId);
  // Ensure sensible defaults for new tables
  const paddedTable = {
    capacity: table.capacity || 4,
    tableNumber: table.tableNumber || String(Date.now()).slice(-4),
    isAvailable: typeof table.isAvailable === "boolean" ? table.isAvailable : true,
    reserved: !!table.reserved,
    currentPartySize: table.currentPartySize || 0,
    occupiedAt: table.occupiedAt || null,
    vacatedAt: table.vacatedAt || null,
  } as Omit<Table, "id">;

  const docRef = await addDoc(tablesCollection, paddedTable);
  return { id: docRef.id, ...paddedTable };
}

export async function updateTable(
  restaurantId: string,
  tableId: string,
  table: Partial<Table>
): Promise<void> {
  const tableDoc = doc(db, "restaurants", restaurantId, "tables", tableId);
  await updateDoc(tableDoc, table);
}

export async function deleteTable(
  restaurantId: string,
  tableId: string
): Promise<void> {
  const tableDoc = doc(db, "restaurants", restaurantId, "tables", tableId);
  await deleteDoc(tableDoc);
}

export function onTablesUpdate(
  restaurantId: string,
  callback: (tables: Table[]) => void
): () => void {
  const tablesCollection = getTablesCollection(restaurantId);
  const q = query(tablesCollection);
  return onSnapshot(q, (querySnapshot) => {
    const tables = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Table[];
    callback(tables);
  });
}
