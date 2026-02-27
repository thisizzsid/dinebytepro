"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { motion } from "framer-motion";
import { User, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { db } from "../../../lib/firebase/config";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";

export default function AuthPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { customer, login, isLoading: isAuthLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    tableNumber: "",
    partySize: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && customer && !isSuccess && slug) router.push(`/${slug}/menu`);
  }, [customer, isAuthLoading, router, isSuccess, slug]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.name.trim().length < 2) {
      newErrors.name = "Full name must be at least 2 characters";
    }
    
    if (formData.phone.length < 10) {
      newErrors.phone = "Please enter a valid mobile number";
    }

    if (formData.tableNumber.trim().length === 0) {
      newErrors.tableNumber = "Enter your table number";
    }

    if (formData.partySize < 1) {
      newErrors.partySize = "Party size must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      const customerData = {
        name: formData.name,
        mobile: formData.phone,
        verified: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "customers"), customerData);

      // Also create a restaurant-scoped customer record for owner visibility (non-blocking)
      try {
        if (slug) {
          await addDoc(collection(db, "restaurants", slug, "customers"), {
            ...customerData,
            globalCustomerId: docRef.id,
          });
        }
      } catch (e) {
        console.warn("Failed to create restaurant-scoped customer record:", e);
      }

      login({
        id: docRef.id,
        ...customerData,
        createdAt: Timestamp.now(),
      });

      setIsSuccess(true);
      setTimeout(() => {
        if (slug) {
          const query = new URLSearchParams({
            table: formData.tableNumber,
            party: String(formData.partySize),
          }).toString();
          router.push(`/${slug}/menu?${query}`);
        }
      }, 1500);
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({ global: "Failed to connect to the database. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border border-orange-100"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="text-green-600 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-500 font-bold mb-6">Let's get you some chai.</p>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5 }}
              className="bg-green-500 h-full"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col p-6 items-center justify-center overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 lg:p-10 border border-orange-100 relative">
        
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-orange-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 rotate-6 shadow-2xl shadow-orange-600/20 group-hover:rotate-12 transition-transform duration-500">
            <img src="/moclogo.png" alt="DineByte" className="w-12 h-12 object-contain brightness-0 invert" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 leading-tight mb-2 tracking-tight">DineByte</h1>
          <p className="text-gray-400 font-bold mb-10 uppercase tracking-[0.3em] text-[10px]">Digital Dining Experience</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {errors.global && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600"
            >
              <AlertCircle className="shrink-0" size={20} />
              <p className="text-sm font-bold">{errors.global}</p>
            </motion.div>
          )}

          <div className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
              <div className="relative">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.name ? 'text-red-400' : 'text-gray-300'}`} />
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter your name"
                  className={`w-full bg-gray-50 border-2 rounded-2xl py-4 pl-12 pr-4 text-gray-900 font-bold focus:ring-0 transition-all ${
                    errors.name ? 'border-red-100 bg-red-50/30' : 'border-transparent focus:border-orange-600'
                  }`}
                />
              </div>
              {errors.name && <p className="text-[10px] text-red-500 font-black uppercase tracking-tighter ml-1">{errors.name}</p>}
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
              <div className="relative auth-phone-input">
                <PhoneInput
                  country={'in'}
                  value={formData.phone}
                  onChange={(val) => handleInputChange("phone", val)}
                  containerClass={`!w-full !rounded-2xl !bg-gray-50 !border-2 transition-all ${errors.phone ? '!border-red-100 !bg-red-50/30' : '!border-transparent'}`}
                  inputClass="!w-full !h-[56px] !rounded-2xl !bg-transparent !border-none !pl-14 !text-gray-900 !font-bold !text-base"
                  buttonClass="!bg-transparent !border-none !rounded-l-2xl !pl-4"
                />
              </div>
              {errors.phone && <p className="text-[10px] text-red-500 font-black uppercase tracking-tighter ml-1">{errors.phone}</p>}
            </div>

            {/* Table Number */}
            <div className="space-y-2">
              <label htmlFor="auth-table-number" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Table Number</label>
              <input
                type="text"
                id="auth-table-number"
                value={formData.tableNumber}
                onChange={(e) => handleInputChange("tableNumber", e.target.value)}
                placeholder="Enter table number (printed on table)"
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-4 text-gray-900 font-bold focus:ring-0 transition-all ${
                  errors.tableNumber ? 'border-red-100 bg-red-50/30' : 'border-transparent focus:border-orange-600'
                }`}
              />
              {errors.tableNumber && <p className="text-[10px] text-red-500 font-black uppercase tracking-tighter ml-1">{errors.tableNumber}</p>}
            </div>

            {/* Party Size */}
            <div className="space-y-2">
              <label htmlFor="auth-party-size" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Number of Diners</label>
              <input
                type="number"
                id="auth-party-size"
                min={1}
                value={formData.partySize}
                onChange={(e) => handleInputChange("partySize", parseInt(e.target.value || "1", 10))}
                placeholder="e.g., 2"
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-4 text-gray-900 font-bold focus:ring-0 transition-all ${
                  errors.partySize ? 'border-red-100 bg-red-50/30' : 'border-transparent focus:border-orange-600'
                }`}
              />
              {errors.partySize && <p className="text-[10px] text-red-500 font-black uppercase tracking-tighter ml-1">{errors.partySize}</p>}
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-600 text-white py-6 rounded-4xl font-black text-lg shadow-2xl shadow-orange-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>START ORDERING <ArrowRight size={24} /></>
            )}
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] text-gray-400 leading-relaxed uppercase tracking-[0.2em] font-black">
          Quick • Secure • Real-time
        </p>
      </div>
    </div>
  );
}
