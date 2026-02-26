import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

export interface InvoiceSettings {
  shopName: string;
  address: string;
  contact: string;
  gstin: string;
  cgst: number;
  sgst: number;
  igst: number;
}

const getSettingsDoc = (restaurantId: string) =>
  doc(db, "restaurants", restaurantId, "settings", "invoice");

export async function getInvoiceSettings(
  restaurantId: string
): Promise<InvoiceSettings | null> {
  const settingsDoc = getSettingsDoc(restaurantId);
  const docSnap = await getDoc(settingsDoc);
  if (docSnap.exists()) {
    return docSnap.data() as InvoiceSettings;
  }
  return null;
}

export async function saveInvoiceSettings(
  restaurantId: string,
  settings: InvoiceSettings
): Promise<void> {
  const settingsDoc = getSettingsDoc(restaurantId);
  await setDoc(settingsDoc, settings);
}
