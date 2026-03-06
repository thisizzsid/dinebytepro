"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/lib/restaurant-context";
import {
  getInvoiceSettings,
  saveInvoiceSettings,
  InvoiceSettings,
} from "@/lib/firebase/settings";
import AdminGuard from "@/components/AdminGuard";
import { 
  FileText, 
  Save, 
  LayoutDashboard, 
  Activity, 
  Table as TableIcon, 
  List, 
  BarChart3, 
  Settings2, 
  LogOut,
  Store,
  MapPin,
  Phone,
  Hash,
  Percent,
  CheckCircle2,
  Loader2,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useParams } from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant } = useRestaurant();
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [gstin, setGstin] = useState("");
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [igst, setIgst] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (restaurant) {
      getInvoiceSettings(restaurant.id).then((settings) => {
        if (settings) {
          setShopName(settings.shopName);
          setAddress(settings.address);
          setContact(settings.contact);
          setGstin(settings.gstin);
          setCgst(settings.cgst);
          setSgst(settings.sgst);
          setIgst(settings.igst);
        }
      });
    }
  }, [restaurant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    if (restaurant) {
      const settings: InvoiceSettings = {
        shopName,
        address,
        contact,
        gstin,
        cgst,
        sgst,
        igst,
      };
      await saveInvoiceSettings(restaurant.id, settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 flex overflow-hidden">
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="p-8 lg:p-12 max-w-300 mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Billing Config</h2>
                <div className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                  <span className="flex items-center gap-2"><Calendar size={16} /> {format(new Date(), 'EEEE, MMM do')}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span className="flex items-center gap-2 text-blue-600"><FileText size={16} /> Invoice Customization</span>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
              {/* Form Section */}
              <div className="xl:col-span-2 space-y-8">
                <div className="bg-white rounded-4xl p-10 shadow-sm border border-gray-100">
                  <form onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Shop Name</label>
                        <div className="relative">
                          <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                          <input 
                            type="text"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            placeholder="e.g. Ministry Of Chai"
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                          <input 
                            type="text"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-4 text-gray-300" size={18} />
                          <textarea 
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter full business address..."
                            rows={3}
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">GSTIN (Tax Identification)</label>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                          <input 
                            type="text"
                            value={gstin}
                            onChange={(e) => setGstin(e.target.value)}
                            placeholder="27AAAAA0000A1Z5"
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Percent size={18} className="text-orange-600" /> Tax Configuration
                      </h3>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CGST (%)</label>
                          <input 
                            type="number"
                            value={cgst || 0}
                            onChange={(e) => setCgst(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600"
                            aria-label="CGST Percentage"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SGST (%)</label>
                          <input 
                            type="number"
                            value={sgst || 0}
                            onChange={(e) => setSgst(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600"
                            aria-label="SGST Percentage"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">IGST (%)</label>
                          <input 
                            type="number"
                            value={igst || 0}
                            onChange={(e) => setIgst(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-600"
                            aria-label="IGST Percentage"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="w-full bg-gray-900 text-white py-5 rounded-4xl font-black text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} SAVE BILLING CONFIGURATION
                    </button>
                  </form>
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-8">
                <div className="sticky top-12">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Live Invoice Preview</p>
                  <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 -mr-16 -mt-16 rounded-full opacity-50" />
                    
                    <div className="text-center mb-8">
                      <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-1">{shopName || 'RESTAURANT NAME'}</h4>
                      <p className="text-[10px] text-gray-500 font-bold leading-relaxed max-w-50 mx-auto uppercase">{address || 'ENTER ADDRESS ABOVE'}</p>
                      <p className="text-[10px] text-gray-900 font-black mt-2">TEL: {contact || '+91 00000 00000'}</p>
                    </div>

                    <div className="border-t border-b border-dashed border-gray-200 py-4 mb-6">
                      <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase mb-2">
                        <span>GSTIN: {gstin || 'NOT CONFIGURED'}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-gray-900 uppercase">
                        <span>Order #1234</span>
                        <span>{format(new Date(), 'dd/MM/yy')}</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between text-xs font-bold text-gray-900">
                        <span>Sample Item x2</span>
                        <span>₹150.00</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-gray-900">
                        <span>Example Product x1</span>
                        <span>₹90.00</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500">
                        <span>Subtotal</span>
                        <span>₹240.00</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-gray-500">
                        <span>CGST ({cgst}%)</span>
                        <span>₹{(240 * cgst / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-gray-500">
                        <span>SGST ({sgst}%)</span>
                        <span>₹{(240 * sgst / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-gray-900 pt-2 uppercase">
                        <span>Grand Total</span>
                        <span>₹{(240 * (1 + (cgst + sgst) / 100)).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-center mt-12">
                      <p className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Thank You!</p>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Visit Again</p>
                    </div>
                  </div>

                  {showSuccess && (
                    <div className="mt-6 bg-green-50 text-green-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-green-100 animate-bounce">
                      <CheckCircle2 size={18} /> Settings synchronized successfully!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
