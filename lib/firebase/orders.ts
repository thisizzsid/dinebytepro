import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "./config";
import { Order } from "@/types/models";

const getOrdersCollection = (restaurantId: string) =>
  collection(db, "restaurants", restaurantId, "orders");

export async function getOrders(restaurantId: string): Promise<Order[]> {
  const ordersCollection = getOrdersCollection(restaurantId);
  
  // 17-day History Logic: 
  const seventeenDaysAgo = new Date();
  seventeenDaysAgo.setDate(seventeenDaysAgo.getDate() - 17);
  
  const q = query(
    ordersCollection,
    where("createdAt", ">=", seventeenDaysAgo),
    orderBy("createdAt", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Order[];
}
