import { OrderType, PaymentType, PaymentStatus, OrderStatus, OrderItem, MenuItem } from "./index";
import type { Timestamp } from "firebase/firestore";

export interface Customer {
  id?: string;
  name: string;
  mobile: string;
  address?: string;
  dueAmount?: number;
  verified: boolean;
  createdAt: Timestamp;
}

export interface DueTransaction {
  id?: string;
  customerId: string;
  amount: number;
  type: 'gave' | 'got'; // gave = customer owes (red), got = customer paid (green)
  note?: string;
  timestamp: Timestamp;
}

export interface LocationLog {
  id?: string;
  restaurantId: string;
  customerId: string;
  customerName: string;
  userLat: number;
  userLng: number;
  restaurantLat: number;
  restaurantLng: number;
  distance: number;
  isValid: boolean;
  isSpoofed?: boolean;
  timestamp: Timestamp;
  orderId?: string;
}

export interface Order {
  id?: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  type: OrderType;
  tableNumber?: string;
  items: OrderItem[];
  totalAmount: number;
  taxAmount: number;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Timestamp;
  lastPingAt?: Timestamp;
  queuePosition?: number;
  estimatedWaitTime?: number; // in minutes
  locationValidated?: boolean;
  locationDistance?: number;
}

export interface Table {
  id?: string;
  tableNumber: string;
  capacity: number;
  isAvailable: boolean;
  reserved?: boolean;
  reservedUntil?: Timestamp;
  currentPartySize?: number;
  occupiedAt?: Timestamp;
  vacatedAt?: Timestamp;
  qrText?: string;
  wifiSpeed?: string;
  x?: number;
  y?: number;
}

export interface Reservation {
  id?: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  tableId: string;
  tableNumber: string;
  dateTime: Timestamp;
  partySize: number;
  createdAt: Timestamp;
}

export interface InventoryItem {
  id?: string;
  name: string;
  quantity: number;
  unit: string; // e.g., "kg", "ltr", "pcs", "gm"
  lowStockThreshold: number;
  category: string; // e.g., "Dairy", "Vegetables", "Spices"
  lastUpdated: Timestamp;
  expiryDate?: Timestamp;
}

export interface RecipeIngredient {
  inventoryItemId: string;
  name: string;
  quantity: number; // Quantity needed per dish/item
  unit: string;
}

export interface MenuItemWithInventory extends MenuItem {
  ingredients: RecipeIngredient[];
}

export interface WastageRecord {
  id?: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  reason: string; // e.g., "Expired", "Spilled", "Spoiled"
  recordedAt: Timestamp;
  recordedBy: string;
}
