import { collection, getDocs, query } from "firebase/firestore";
import { db } from "./config";
import { Order } from "@/types/models";

const getOrdersCollection = (restaurantId: string) =>
  collection(db, "restaurants", restaurantId, "orders");

export async function getOrders(restaurantId: string): Promise<Order[]> {
  const ordersCollection = getOrdersCollection(restaurantId);
  const q = query(ordersCollection);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Order[];
}
