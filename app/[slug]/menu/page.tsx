"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { MENU_ITEMS } from "../../../lib/data";
import { useCart } from "../../../lib/cart-context";
import { useAuth } from "../../../lib/auth-context";
import { useRestaurant } from "@/lib/restaurant-context";
import { formatPrice } from "../../../lib/utils";
import { ShoppingBag, Plus, Minus, Check, Clock, Table, Trash2, Utensils, Navigation, MessageCircle, Phone, HelpCircle, AlertCircle, Mail } from "lucide-react";
import { db } from "../../../lib/firebase/config";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, where, getDocs, updateDoc } from "firebase/firestore";
import { OrderType, PaymentType, MenuItem, ItemVariant, OrderItem } from "../../../types";
import { motion, AnimatePresence } from "framer-motion";

function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restaurant, isLoading: isRestroLoading } = useRestaurant();
  const tableNumber = searchParams.get("table");
  const partySize = searchParams.get("party");
  const { customer, isLoading: isAuthLoading } = useAuth();
  const { items, addToCart, removeFromCart, clearCart, totalAmount } = useCart();
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [upiId, setUpiId] = useState("");
  const [orderType, setOrderType] = useState<OrderType>(tableNumber ? "dinein" : "takeaway");
  const [paymentType, setPaymentType] = useState<PaymentType>("upi");
  const [isOrdering, setIsOrdering] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showSupport, setShowSupport] = useState(false);
  const [showFullCheckout, setShowFullCheckout] = useState(false);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthLoading && !customer && restaurant) {
      console.log("No customer found, redirecting to auth");
      router.push(`/${restaurant.slug}/auth`);
    }
  }, [customer, isAuthLoading, router, restaurant]);

  useEffect(() => {
    if (!restaurant || !customer) return;

    // Listen for active orders of this customer
    const ordersQ = query(
      collection(db, "restaurants", restaurant.id, "orders"),
      where("customerId", "==", customer.id),
      where("orderStatus", "in", ["received", "preparing", "ready"])
    );

    const unsubOrders = onSnapshot(ordersQ, (snapshot) => {
      const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveOrders(orders);
    });

    return () => unsubOrders();
  }, [restaurant, customer]);

  useEffect(() => {
    if (!restaurant) return;
    
    console.log("Starting Menu Sync for restaurant:", restaurant.id);
    // Sync Menu from restaurant-scoped collection
    const q = query(
      collection(db, "restaurants", restaurant.id, "menu"), 
      orderBy("category")
    );
    
    const unsubMenu = onSnapshot(q, 
      (snapshot) => {
        const dbData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MenuItem[];
        setMenuItems(dbData);
        setIsMenuLoading(false);
      },
      (error) => {
        console.error("Menu Sync Error:", error);
        setIsMenuLoading(false);
      }
    );

    // UPI Settings are now part of the restaurant document
    setUpiId(restaurant.settings?.upiId || "");

    return () => unsubMenu();
  }, [restaurant]);

  const categories = ["All", ...Array.from(new Set(menuItems.map(i => i.category)))];

  const filteredItems = activeCategory === "All" 
    ? menuItems 
    : menuItems.filter(i => i.category === activeCategory);

  const handlePlaceOrder = async () => {
    if (items.length === 0 || !customer || !restaurant) return;
    
    setIsOrdering(true);
    try {
      const orderData = {
        restaurantId: restaurant.id,
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        type: orderType,
        tableNumber: orderType === "dinein" ? (tableNumber || "General") : "N/A",
        items: items,
        totalAmount: totalAmount,
        taxAmount: totalAmount * 0.05, // 5% GST
        paymentType: paymentType,
        paymentStatus: "pending",
        orderStatus: "received",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "restaurants", restaurant.id, "orders"), orderData);
      
      // Automatically lock table if it's a dine-in order
      if (orderType === "dinein" && tableNumber) {
        try {
          const tablesQ = query(
            collection(db, "restaurants", restaurant.id, "tables"),
            where("tableNumber", "==", tableNumber)
          );
          const tableSnapshot = await getDocs(tablesQ);
          if (!tableSnapshot.empty) {
            const tableDoc = tableSnapshot.docs[0];
            await updateDoc(tableDoc.ref, {
              isAvailable: false,
              occupiedAt: serverTimestamp(),
              currentPartySize: parseInt(partySize || "1")
            });
          }
        } catch (tableError) {
          console.error("Error locking table:", tableError);
        }
      }

      clearCart();
      setShowFullCheckout(false);
      alert("Order placed successfully! Track it using the floating icon.");
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  if (isRestroLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center font-black text-orange-600 animate-pulse text-2xl">
        INITIALIZING SESSION...
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={48} />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Restaurant Not Found</h1>
        <p className="text-gray-400 font-bold mb-8">The restaurant you are looking for does not exist or has been deactivated.</p>
        <button 
          onClick={() => router.push("/")}
          className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-sm"
        >
          BACK TO HOME
        </button>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-sm sticky top-0 z-30 border-b border-orange-50">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 relative">
              <img src="/moclogo.png" alt="DineByte Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-orange-900 leading-tight">DineByte</h1>
              <p className="text-sm font-bold text-orange-600/60 uppercase tracking-widest">Premium Restaurant Service</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Welcome</p>
            <p className="text-sm font-black text-gray-900">{customer.name.split(' ')[0]}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {tableNumber ? (
            <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider">
              <Table size={14} /> Table {tableNumber}
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider">
              <Clock size={14} /> Takeaway
            </span>
          )}
          {partySize && (
            <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider">
              <Utensils size={14} /> {partySize} Diners
            </span>
          )}
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Verified Device • Secure Ordering</span>
          <a href="https://www.dinebyte.in" target="_blank" rel="noopener noreferrer" className="ml-auto px-3 py-2 bg-orange-100 text-orange-600 rounded-xl font-black text-xs hover:bg-orange-200 transition-all">
            🌐 dinebyte.in
          </a>
        </div>
      </header>

      {/* Category Scroll */}
      <div className="flex gap-3 overflow-x-auto px-6 py-8 no-scrollbar sticky top-35 bg-orange-50/80 backdrop-blur-md z-20">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap px-8 py-4 rounded-4xl font-black text-sm transition-all shadow-sm active:scale-95 ${
              activeCategory === cat 
                ? "bg-orange-600 text-white shadow-orange-200" 
                : "bg-white text-orange-900/40 hover:bg-orange-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      <div className="px-6 space-y-6">
        {isMenuLoading && menuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">Loading Menu...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map(item => {
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id} 
                className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-orange-50 group hover:shadow-xl hover:shadow-orange-200/50 transition-all duration-500"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex gap-6">
                    {/* Item Image Placeholder */}
                    <div className="w-24 h-24 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
                      <Utensils size={32} />
                    </div>
                    
                    {/* Item Details */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex flex-col mb-1">
                        <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{item.name}</h3>
                        <p className="text-lg font-black text-orange-600">
                          {item.variants && item.variants.length > 0 
                            ? `From ${formatPrice(Math.min(...item.variants.map((v: ItemVariant) => v.price)))}`
                            : formatPrice(item.price)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 font-medium line-clamp-2 leading-relaxed mb-4">
                        {item.description}
                      </p>
                      
                      <div className="flex items-center gap-1">
                        <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Variants / Add to Cart */}
                  <div className="space-y-4">
                    {item.variants && item.variants.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {item.variants.map((variant: ItemVariant) => {
                          const cartItem = items.find((i: OrderItem) => i.id === item.id && i.variantName === variant.name);
                          return (
                            <div key={variant.name} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{variant.name}</span>
                                <span className="text-xs font-black text-orange-600">{formatPrice(variant.price)}</span>
                              </div>
                              
                              {cartItem ? (
                                <div className="flex items-center justify-between bg-gray-900 rounded-xl p-1 shadow-md">
                                  <button 
                                    onClick={() => removeFromCart(item.id, variant.name)}
                                    aria-label={`Remove one ${variant.name}`}
                                    className="p-1 hover:bg-gray-800 rounded-lg text-white transition-colors"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-center font-black text-white text-xs">{cartItem.quantity}</span>
                                  <button 
                                    onClick={() => addToCart({ id: item.id, name: item.name, price: variant.price, quantity: 1, variantName: variant.name })}
                                    aria-label={`Add more ${variant.name}`}
                                    className="p-1 hover:bg-gray-800 rounded-lg text-white transition-colors"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => addToCart({ id: item.id, name: item.name, price: variant.price, quantity: 1, variantName: variant.name })}
                                  className="w-full py-2 bg-white text-orange-600 border border-orange-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                >
                                  ADD
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-end">
                        {items.find((i: OrderItem) => i.id === item.id) ? (
                          <div className="flex items-center bg-gray-900 rounded-2xl p-1 shadow-lg">
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              aria-label="Remove one"
                              className="p-2 hover:bg-gray-800 rounded-xl text-white transition-colors"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-8 text-center font-black text-white text-sm">
                              {items.find((i: OrderItem) => i.id === item.id)?.quantity}
                            </span>
                            <button 
                              onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, quantity: 1 })}
                              aria-label="Add more"
                              className="p-2 hover:bg-gray-800 rounded-xl text-white transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, quantity: 1 })}
                            aria-label="Add to cart"
                            className="bg-orange-600 text-white px-8 py-3 rounded-2xl shadow-lg shadow-orange-600/20 active:scale-95 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2"
                          >
                            ADD TO CART <Plus size={18} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-gray-300">
            <div className="w-20 h-20 bg-gray-100 rounded-[2.5rem] flex items-center justify-center mb-6 opacity-50">
              <ShoppingBag size={40} />
            </div>
            <p className="text-lg font-black text-gray-900 mb-1">No items found</p>
            <p className="text-xs font-bold uppercase tracking-widest">Try a different category</p>
          </div>
        )}
      </div>

      {/* Tracking & Support FABs */}
      <div className="fixed bottom-32 right-6 z-40 flex flex-col gap-4">
        <AnimatePresence>
          {activeOrders.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              onClick={() => router.push(`/${restaurant?.slug}/track?id=${activeOrders[0].id}`)}
              className="w-16 h-16 bg-orange-600 text-white rounded-4xl flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all relative group"
              title="Track Active Order"
            >
              <Clock size={24} />
              <span className="text-[8px] font-black uppercase mt-1">Track</span>
              <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {activeOrders.length}
              </span>
            </motion.button>
          )}

          {showSupport && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-4 border border-orange-100 w-64"
            >
              <div className="space-y-2">
                <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-green-50 rounded-2xl transition-colors">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">WhatsApp</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Quick Response</p>
                  </div>
                </a>
                <a href="tel:+1234567890" className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-2xl transition-colors">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Voice Call</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Direct Support</p>
                  </div>
                </a>
                <a href="mailto:siddhant.anand17@gmail.com" className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-2xl transition-colors">
                  <div className="w-10 h-10 bg-gray-500 rounded-xl flex items-center justify-center text-white">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Email</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Support</p>
                  </div>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => setShowSupport(!showSupport)}
          aria-label={showSupport ? "Close Support" : "Open Support"}
          className="w-16 h-16 bg-gray-900 text-white rounded-4xl flex items-center justify-center shadow-2xl active:scale-95 transition-all self-end"
        >
          {showSupport ? <Check size={28} /> : <HelpCircle size={28} />}
        </button>
      </div>

      {/* Slim Checkout Bar */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 z-50 flex justify-center"
          >
            <div className={`bg-gray-900 text-white rounded-4xl shadow-2xl border-t border-white/10 w-full max-w-lg overflow-hidden transition-all duration-300 ${showFullCheckout ? 'p-8' : 'p-3 flex items-center justify-between'}`}>
              {!showFullCheckout ? (
                /* Slim Mode */
                <>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="relative">
                      <ShoppingBag size={24} className="text-orange-500" />
                      <span className="absolute -top-2 -right-2 bg-white text-gray-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                        {items.reduce((sum: number, i: OrderItem) => sum + i.quantity, 0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total</p>
                      <p className="text-lg font-black">{formatPrice(totalAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={clearCart}
                      aria-label="Clear cart"
                      className="p-3 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button 
                      onClick={() => setShowFullCheckout(true)}
                      className="bg-orange-600 text-white px-8 py-4 rounded-3xl font-black text-sm shadow-xl active:scale-95 transition-all"
                    >
                      CHECKOUT
                    </button>
                  </div>
                </>
              ) : (
                /* Full Mode */
                <div className="w-full">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Confirm Order</p>
                      <p className="text-3xl font-black">{formatPrice(totalAmount)}</p>
                      <p className="text-[10px] text-orange-500 font-bold mt-1 tracking-wider uppercase">+ {formatPrice(totalAmount * 0.05)} GST Applied</p>
                    </div>
                    <button 
                      onClick={() => setShowFullCheckout(false)}
                      className="bg-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      CLOSE
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button 
                      onClick={() => setOrderType("dinein")}
                      className={`flex flex-col items-center justify-center gap-2 p-5 rounded-3xl font-black text-xs transition-all border-2 ${
                        orderType === "dinein" ? "border-orange-600 bg-orange-600/10 text-orange-500" : "border-white/10 text-gray-500"
                      }`}
                    >
                      <Utensils size={24} /> DINE-IN
                    </button>
                    <button 
                      onClick={() => setOrderType("takeaway")}
                      className={`flex flex-col items-center justify-center gap-2 p-5 rounded-3xl font-black text-xs transition-all border-2 ${
                        orderType === "takeaway" ? "border-orange-600 bg-orange-600/10 text-orange-500" : "border-white/10 text-gray-500"
                      }`}
                    >
                      <Navigation size={24} /> TAKEAWAY
                    </button>
                  </div>

                  {/* Payment Type */}
                  <div className="flex gap-3 mb-8">
                    <button 
                      onClick={() => setPaymentType("upi")}
                      className={`flex-1 py-4 rounded-2xl font-black text-[10px] tracking-widest transition-all ${
                        paymentType === "upi" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-gray-500"
                      }`}
                    >
                      {upiId ? `PAY VIA UPI` : "PAY NOW (UPI)"}
                    </button>
                    <button 
                      onClick={() => setPaymentType("counter")}
                      className={`flex-1 py-4 rounded-2xl font-black text-[10px] tracking-widest transition-all ${
                        paymentType === "counter" ? "bg-white text-gray-900" : "bg-white/5 text-gray-500"
                      }`}
                    >
                      PAY AT COUNTER
                    </button>
                  </div>

                  {paymentType === "upi" && upiId && (
                    <div className="mb-8 p-4 bg-blue-600/10 rounded-2xl border border-blue-600/20 text-center">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 text-center">Scan or Pay to UPI</p>
                      <p className="font-black text-blue-500 text-lg">{upiId}</p>
                      <a 
                        href={`upi://pay?pa=${upiId}&pn=DineByte&am=${(totalAmount * 1.05).toFixed(2)}&cu=INR`}
                        className="mt-3 inline-block bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black"
                      >
                        OPEN UPI APP
                      </a>
                    </div>
                  )}

                  <button 
                    disabled={isOrdering}
                    onClick={handlePlaceOrder}
                    className="w-full bg-orange-600 text-white py-6 rounded-4xl font-black text-xl shadow-2xl shadow-orange-600/20 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    {isOrdering ? (
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>CONFIRM ORDER <ShoppingBag size={24} /></>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-orange-50 flex items-center justify-center font-black text-orange-600 animate-pulse text-2xl">LOADING MENU...</div>}>
      <MenuContent />
    </Suspense>
  );
}
