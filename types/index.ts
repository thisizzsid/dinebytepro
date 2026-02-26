import type { Timestamp } from "firebase/firestore";
export type OrderType = 'dinein' | 'takeaway';
export type PaymentType = 'upi' | 'counter';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus = 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface ItemVariant {
  name: string; // e.g., "Small", "Medium", "Full", "Half"
  price: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variantName?: string; // e.g., "Medium"
}

export interface Order {
  id?: string;
  type: OrderType;
  tableNumber?: string;
  items: OrderItem[];
  totalAmount: number;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Timestamp;
  customerName: string;
  customerMobile: string;
  taxAmount?: number;
  lastPingAt?: Timestamp;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // Base price or starting price
  category: string;
  image?: string;
  variants?: ItemVariant[];
}
