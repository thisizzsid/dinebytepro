"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { 
  Store, 
  Globe, 
  Lock, 
  User,
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    activationCode: "",
    adminUsername: "",
    adminPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.activationCode !== "Dinebyte@321") {
      setError("Invalid activation code. Please contact DineByte support.");
      setLoading(false);
      return;
    }

    if (formData.adminUsername.length < 3 || formData.adminPassword.length < 6) {
      setError("Username must be at least 3 chars and Password at least 6 chars.");
      setLoading(false);
      return;
    }

    const slug = formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    
    try {
      const restroRef = doc(db, "restaurants", slug);
      const restroSnap = await getDoc(restroRef);

      if (restroSnap.exists()) {
        setError("This URL slug is already taken. Please choose another.");
        setLoading(false);
        return;
      }

      await setDoc(restroRef, {
        name: formData.name,
        slug: slug,
        activatedAt: serverTimestamp(),
        status: "active",
        admin: {
          username: formData.adminUsername,
          password: formData.adminPassword // Simple storage for now, ideally hashed
        },
        settings: {
          upiId: "",
          currency: "INR",
          timezone: "Asia/Kolkata"
        }
      });

      // Initialize default settings
      await setDoc(doc(db, "restaurants", slug, "settings", "invoice"), {
        shopName: formData.name,
        address: "",
        contact: "",
        gstin: "",
        cgst: 2.5,
        sgst: 2.5,
        igst: 0
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${slug}/admin`);
      }, 2000);

    } catch (err) {
      console.error(err);
      setError("An error occurred during activation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-600 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl p-10 lg:p-16 relative z-10"
      >
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6 shadow-xl shadow-orange-600/20">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 leading-tight mb-3">Activate DineByte</h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Restaurant Onboarding Terminal</p>
        </div>

        {success ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-10"
          >
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Activation Successful!</h2>
            <p className="text-gray-500 font-bold">Redirecting to your command center...</p>
          </motion.div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Restaurant Name</label>
                <div className="relative">
                  <Store className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Blue Lagoon Cafe"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl py-4 pl-14 pr-6 text-gray-900 font-black transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Desired URL Slug</label>
                <div className="relative">
                  <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input 
                    required
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-")})}
                    placeholder="e.g. blue-lagoon"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl py-4 pl-14 pr-6 text-gray-900 font-black transition-all outline-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-bold ml-1">Your URL will be: dinebyte.com/{formData.slug || "your-slug"}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Activation ID Number</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input 
                    required
                    type="text"
                    value={formData.activationCode}
                    onChange={(e) => setFormData({...formData, activationCode: e.target.value})}
                    placeholder="Enter ID Number"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl py-4 pl-14 pr-6 text-gray-900 font-black tracking-widest transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Admin Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      type="text"
                      value={formData.adminUsername}
                      onChange={(e) => setFormData({...formData, adminUsername: e.target.value})}
                      placeholder="e.g. admin"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl py-3.5 pl-11 pr-4 text-gray-900 font-black transition-all outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Admin Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      required
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                      placeholder="Min 6 chars"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-600 rounded-2xl py-3.5 pl-11 pr-4 text-gray-900 font-black transition-all outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-100"
              >
                <AlertCircle size={18} /> {error}
              </motion.div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full bg-gray-900 text-white py-6 rounded-2xl font-black text-sm tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>ACTIVATE RESTAURANT <ArrowRight size={18} /></>}
            </button>
          </form>
        )}

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-loose">
            By activating, you agree to DineByte's <br/>
            <span className="text-gray-900 cursor-pointer hover:text-orange-600 transition-colors">Terms of Service</span> & <span className="text-gray-900 cursor-pointer hover:text-orange-600 transition-colors">Privacy Policy</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
