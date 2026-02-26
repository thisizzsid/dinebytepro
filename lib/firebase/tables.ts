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
  const docRef = await addDoc(tablesCollection, table);
  return { id: docRef.id, ...table };
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
