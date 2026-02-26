"use client";

import { Order } from "@/types/models";
import { InvoiceSettings } from "@/lib/firebase/settings";

interface InvoiceProps {
  order: Order;
  settings: InvoiceSettings;
}

export default function Invoice({ order, settings }: InvoiceProps) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cgst = (subtotal * settings.cgst) / 100;
  const sgst = (subtotal * settings.sgst) / 100;
  const igst = (subtotal * settings.igst) / 100;
  const total = subtotal + cgst + sgst + igst;

  return (
    <div className="p-8 bg-white" id="invoice">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{settings.shopName}</h1>
        <p>{settings.address}</p>
        <p>{settings.contact}</p>
        <p>GSTIN: {settings.gstin}</p>
      </div>
      <hr className="my-4" />
      <div className="flex justify-between">
        <div>
          <p>
            <strong>Order ID:</strong> {order.id}
          </p>
          <p>
            <strong>Customer:</strong> {order.customerName}
          </p>
        </div>
        <div>
          <p>
            <strong>Date:</strong> {new Date().toLocaleDateString()}
          </p>
          <p>
            <strong>Table:</strong> {order.tableNumber}
          </p>
        </div>
      </div>
      <hr className="my-4" />
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">Item</th>
            <th className="text-right">Quantity</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">₹{item.price.toFixed(2)}</td>
              <td className="text-right">
                ₹{(item.price * item.quantity).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-4" />
      <div className="flex justify-end">
        <div className="w-1/2">
          <div className="flex justify-between">
            <p>Subtotal:</p>
            <p>₹{subtotal.toFixed(2)}</p>
          </div>
          <div className="flex justify-between">
            <p>CGST ({settings.cgst}%):</p>
            <p>₹{cgst.toFixed(2)}</p>
          </div>
          <div className="flex justify-between">
            <p>SGST ({settings.sgst}%):</p>
            <p>₹{sgst.toFixed(2)}</p>
          </div>
          <div className="flex justify-between">
            <p>IGST ({settings.igst}%):</p>
            <p>₹{igst.toFixed(2)}</p>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-bold">
            <p>Total:</p>
            <p>₹{total.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
