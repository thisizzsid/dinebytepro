"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { db } from "../../../lib/firebase/config";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { Order } from "../../../types/models";
import { formatPrice } from "../../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { BellRing, CheckCircle, Receipt, ArrowLeft, Loader2, MapPin, Smartphone, Clock, ChefHat, CheckCircle2, ShoppingBag, Volume2, VolumeX, Bell } from "lucide-react";
import { notificationManager } from "../../../lib/notification-manager";
import { useRestaurant } from "../../../lib/restaurant-context";
import { OrderItem } from "../../../types";

function TrackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(10); 
  const [hasNotified, setHasNotified] = useState(false);
  const [notifSettings, setNotifSettings] = useState({ volume: 1.0, enabled: true });
  const [isPinging, setIsPinging] = useState(false);
  const { restaurant } = useRestaurant();
  const [invoiceSettings, setInvoiceSettings] = useState<any>(null);

  useEffect(() => {
    if (restaurant) {
      const unsub = onSnapshot(doc(db, "restaurants", restaurant.id, "settings", "invoice"), (docSnap) => {
        if (docSnap.exists()) {
          setInvoiceSettings(docSnap.data());
        }
      });
      return () => unsub();
    }
  }, [restaurant]);

  useEffect(() => {
    if (notificationManager) {
      setNotifSettings(notificationManager.getSettings());
    }
  }, []);

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!orderId) {
      if (slug) router.push(`/${slug}/menu`);
      return;
    }

    let previousStatus: string | null = null;

    const unsubscribe = onSnapshot(doc(db, "restaurants", slug as string, "orders", orderId), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Order;
        setOrder({ id: doc.id, ...data } as Order);
        
        // Trigger audio notification on status change
        if (previousStatus && previousStatus !== data.orderStatus) {
          notificationManager?.playStatusUpdate();
        }
        previousStatus = data.orderStatus;

        // Ping System: Notify when order is ready or delivered
        if ((data.orderStatus === 'ready' || data.orderStatus === 'delivered') && !hasNotified) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("DineByte", {
              body: `Your order #${orderId.slice(-6).toUpperCase()} is ${data.orderStatus}!`,
              icon: "/moclogo.png"
            });
          }
          // Also play a subtle sound or trigger vibration if supported
          if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
          setHasNotified(true);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, router, hasNotified]);

  useEffect(() => {
    if (!order) return;
    
    // Simple mock countdown logic based on order status
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (order.orderStatus === 'delivered') return 0;
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [order]);

  const handlePingAdmin = async () => {
    if (!orderId || isPinging) return;
    setIsPinging(true);
    try {
      await updateDoc(doc(db, "restaurants", slug as string, "orders", orderId), {
        lastPingAt: serverTimestamp()
      });
      alert("Admin pinged! They will be with you shortly.");
    } catch (e) {
      console.error("Ping Error:", e);
    } finally {
      setTimeout(() => setIsPinging(false), 5000); // Prevent spamming
    }
  };

  // cancellation support: allow user to cancel order within 2 minutes of placing
  const canCancel = order ? (() => {
    if (!['received', 'preparing'].includes(order.orderStatus)) return false;
    const createdMs = order.createdAt && typeof (order.createdAt as any).toMillis === 'function'
      ? (order.createdAt as any).toMillis()
      : order.createdAt instanceof Date
        ? order.createdAt.getTime()
        : 0;
    return Date.now() - createdMs < 2 * 60 * 1000;
  })() : false;

  const handleCancelOrder = async () => {
    if (!orderId || !slug || !order) return;
    try {
      const orderRef = doc(db, "restaurants", slug as string, "orders", orderId);
      await updateDoc(orderRef, { orderStatus: 'cancelled' });
      alert('Your order has been cancelled.');
      router.push(`/${slug}/menu`);
    } catch (e) {
      console.error('Cancel error:', e);
      alert('Failed to cancel order.');
    }
  };

  const generateReceipt = () => {
    if (!order) return;

    const doc = new jsPDF({
      unit: "mm",
      format: [80, 200], // Thermal printer width
    });

    // Styles
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(invoiceSettings?.shopName || restaurant?.name || "RESTAURANT", 40, 10, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(invoiceSettings?.address || "Address details in settings", 40, 15, { align: "center" });
    doc.text(`Contact: ${invoiceSettings?.contact || "N/A"}`, 40, 19, { align: "center" });
    if (invoiceSettings?.gstin) {
      doc.text(`GSTIN: ${invoiceSettings.gstin}`, 40, 23, { align: "center" });
    }
    
    doc.line(5, 26, 75, 26);
    
    doc.text(`Order: #${order.id?.slice(-6).toUpperCase()}`, 5, 32);
    doc.text(`Date: ${new Date().toLocaleString()}`, 5, 36);
    doc.text(`Customer: ${order.customerName}`, 5, 40);
    doc.text(`Table: ${order.tableNumber || "Takeaway"}`, 5, 44);
    
    autoTable(doc, {
      startY: 48,
      margin: { left: 5, right: 5 },
      styles: { fontSize: 7, cellPadding: 1, font: "helvetica" },
      head: [['Item', 'Qty', 'Price']],
      body: order.items.map((i: OrderItem) => [
        i.variantName ? `${i.name} (${i.variantName})` : i.name, 
        i.quantity, 
        (i.price * i.quantity).toFixed(2)
      ]),
      theme: 'plain',
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;
    const cgstRate = invoiceSettings?.cgst ?? 2.5;
    const sgstRate = invoiceSettings?.sgst ?? 2.5;
    const igstRate = invoiceSettings?.igst ?? 0;
    const subtotal = order.totalAmount;
    
    const cgst = (subtotal * cgstRate) / 100;
    const sgst = (subtotal * sgstRate) / 100;
    const igst = (subtotal * igstRate) / 100;
    const total = subtotal + cgst + sgst + igst;

    doc.text(`Subtotal: ${formatPrice(subtotal)}`, 75, finalY, { align: "right" });
    if (cgstRate > 0) doc.text(`CGST (${cgstRate}%): ${formatPrice(cgst)}`, 75, finalY + 4, { align: "right" });
    if (sgstRate > 0) doc.text(`SGST (${sgstRate}%): ${formatPrice(sgst)}`, 75, finalY + 8, { align: "right" });
    if (igstRate > 0) doc.text(`IGST (${igstRate}%): ${formatPrice(igst)}`, 75, finalY + 12, { align: "right" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${formatPrice(total)}`, 75, finalY + 18, { align: "right" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for dining with us!", 40, finalY + 25, { align: "center" });
    
    doc.save(`receipt-${order.id}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
      <p className="font-black text-orange-900 tracking-widest uppercase">Fetching Order Details...</p>
    </div>
  );

  if (!order) return null;

  const steps = [
    { label: "Order Received", icon: ShoppingBag, status: "received", time: "0-2m" },
    { label: "Food Making", icon: ChefHat, status: "preparing", time: "2-8m" },
    { label: "Getting Ready", icon: Clock, status: "ready", time: "8-10m" },
    { label: "Ready for Pickup", icon: CheckCircle2, status: "delivered", time: "Completed" },
  ];

  const currentStepIndex = steps.findIndex(s => s.status === order.orderStatus);

  return (
    <div className="min-h-screen bg-orange-50 pb-20">
      {/* Alert Banner for Ready Status */}
      <AnimatePresence>
        {(order.orderStatus === 'ready' || order.orderStatus === 'delivered') && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white p-4 text-center font-black flex items-center justify-center gap-3 shadow-2xl"
          >
            <BellRing className="animate-bounce" />
            YOUR ORDER IS READY FOR PICKUP!
            <button 
              onClick={() => setHasNotified(true)}
              className="bg-white text-green-600 px-4 py-1 rounded-full text-xs"
            >
              DISMISS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-sm mb-8">
        <button 
          onClick={() => slug && router.push(`/${slug}/menu`)}
          className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest mb-6"
        >
          <ArrowLeft size={16} /> Back to Menu
        </button>
        <div className="flex justify-between items-end">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 relative">
                <img src="/moclogo.png" alt="DineByte Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-orange-900 leading-tight">DineByte</h1>
                <p className="text-sm font-bold text-orange-600/60 uppercase tracking-widest">Order Tracking</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handlePingAdmin}
                disabled={isPinging}
                aria-label="Ping Admin"
                className={`p-4 rounded-3xl shadow-xl transition-all flex items-center gap-2 ${
                  isPinging ? 'bg-gray-100 text-gray-400' : 'bg-white text-orange-600 border border-orange-100 active:scale-95'
                }`}
              >
                <Bell size={24} className={isPinging ? "" : "animate-pulse"} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Ping Admin</span>
              </button>
              <button 
                onClick={generateReceipt}
                aria-label="Download Receipt"
                className="bg-orange-600 text-white p-4 rounded-3xl shadow-xl shadow-orange-200 active:scale-95 transition-all"
              >
                <Receipt size={24} />
              </button>
            </div>
          </div>
      </header>

        {/* cancellation notice/button */}
        {canCancel && (
          <div className="px-6 mb-6">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
              <p className="text-red-600 font-black mb-2">Change of plans?</p>
              <button
                onClick={handleCancelOrder}
                className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm"
              >
                Cancel Order
              </button>
              <p className="text-xs text-red-400 mt-2">
                You can cancel within 2 minutes of placing the order.
              </p>
            </div>
          </div>
        )}

      <div className="px-6 space-y-8">
        {/* Notification Settings */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-orange-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Audio Alerts</h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => notificationManager?.playStatusUpdate()}
                className="p-2 text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                title="Test Sound"
                aria-label="Test Sound"
              >
                <Volume2 size={18} />
              </button>
              <button 
                onClick={() => {
                  const next = !notifSettings.enabled;
                  setNotifSettings(prev => ({ ...prev, enabled: next }));
                  notificationManager?.saveSettings(notifSettings.volume, next);
                }}
                aria-label={notifSettings.enabled ? "Disable Audio" : "Enable Audio"}
                className={`w-12 h-6 rounded-full p-1 transition-all ${notifSettings.enabled ? 'bg-orange-600' : 'bg-gray-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all ${notifSettings.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {notifSettings.volume === 0 ? <VolumeX className="text-gray-400" size={18} /> : <Volume2 className="text-orange-600" size={18} />}
            <input 
              type="range"
              aria-label="Volume"
              min="0"
              max="1"
              step="0.1"
              value={notifSettings.volume}
              onChange={(e) => {
                const next = parseFloat(e.target.value);
                setNotifSettings(prev => ({ ...prev, volume: next }));
                notificationManager?.saveSettings(next, notifSettings.enabled);
              }}
              className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-orange-100 text-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Estimated Waiting Time</p>
            <h2 className="text-6xl font-black text-gray-900 mb-2">{timeLeft} <span className="text-2xl text-orange-600">MIN</span></h2>
            <p className="text-sm font-bold text-gray-500 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              Queue Position: #{order.queuePosition}
            </p>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Clock size={120} strokeWidth={3} />
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-orange-100">
          <h3 className="font-black text-gray-900 mb-8 uppercase tracking-widest text-xs">Live Progress</h3>
          <div className="space-y-10 relative">
            <div className="absolute left-6 top-0 bottom-0 w-1 bg-gray-50 z-0" />
            
            {steps.map((step, idx) => {
              const isActive = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={idx} className={`flex items-start gap-6 relative z-10 transition-all ${isActive ? 'opacity-100' : 'opacity-30'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                    isActive ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'scale-125 ring-8 ring-orange-50' : ''}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-lg leading-tight ${isActive ? 'text-gray-900' : 'text-gray-300'}`}>{step.label}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{step.time}</p>
                  </div>
                  {isCurrent && (
                    <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Active</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Info */}
        <div className="bg-gray-900 text-white rounded-[2.5rem] p-8 flex items-center gap-6">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-orange-500">
            <MapPin size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Pickup Location</p>
            <p className="font-black text-lg leading-tight">Ministry Of Chai - ORN</p>
            <p className="text-xs font-medium text-gray-400">Old Rajendra Nagar, 110060 (New Delhi)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div>Loading Tracker...</div>}>
      <TrackContent />
    </Suspense>
  );
}
