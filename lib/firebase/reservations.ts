import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./config";
import { Reservation } from "@/types/models";
import { Timestamp } from "firebase/firestore";

const getReservationsCollection = (restaurantId: string) =>
  collection(db, "restaurants", restaurantId, "reservations");

export async function createReservation(
  restaurantId: string,
  reservation: Omit<Reservation, "id" | "createdAt">
): Promise<Reservation> {
  const reservationsCollection = getReservationsCollection(restaurantId);
  const docRef = await addDoc(reservationsCollection, {
    ...reservation,
    createdAt: Timestamp.now(),
  });
  return {
    id: docRef.id,
    ...reservation,
    createdAt: Timestamp.now(),
  };
}

export async function getReservations(
  restaurantId: string,
  date: Date
): Promise<Reservation[]> {
  const reservationsCollection = getReservationsCollection(restaurantId);
  const startOfDay = Timestamp.fromDate(
    new Date(date.setHours(0, 0, 0, 0))
  );
  const endOfDay = Timestamp.fromDate(
    new Date(date.setHours(23, 59, 59, 999))
  );
  const q = query(
    reservationsCollection,
    where("dateTime", ">=", startOfDay),
    where("dateTime", "<=", endOfDay)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reservation[];
}
