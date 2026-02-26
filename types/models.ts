import { OrderType, PaymentType, PaymentStatus, OrderStatus, OrderItem } from "./index";
import type { Timestamp } from "firebase/firestore";

export interface Customer {
  id?: string;
  name: string;
  mobile: string;
  verified: boolean;
  createdAt: Timestamp;
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
