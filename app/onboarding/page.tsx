"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  Store,
  Globe,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
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
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!formData.name || !formData.slug) {
      setError("Restaurant name and slug are required.");
      setLoading(false);
      return;
    }

    if (!formData.email || !formData.password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const slug = formData.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");

    try {
      // Check if restaurant already exists
      const restroRef = doc(db, "restaurants", slug);
      const restroSnap = await getDoc(restroRef);

      if (restroSnap.exists()) {
        setError("This URL slug is already taken.");
        setLoading(false);
        return;
      }

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const uid = userCredential.user.uid;

      // Create restaurant document
      await setDoc(restroRef, {
        name: formData.name,
        slug: slug,
        activatedAt: serverTimestamp(),
        status: "active",
        adminUid: uid,
        adminEmail: formData.email,
        settings: {
          upiId: "",
          currency: "INR",
          timezone: "Asia/Kolkata"
        }
      });

      // Create user profile (IMPORTANT for SaaS)
      await setDoc(doc(db, "users", uid), {
        role: "owner",
        email: formData.email,
        restaurantSlug: slug,
        createdAt: serverTimestamp()
      });

      // Initialize invoice settings
      await setDoc(
        doc(db, "restaurants", slug, "settings", "invoice"),
        {
          shopName: formData.name,
          address: "",
          contact: "",
          gstin: "",
          cgst: 2.5,
          sgst: 2.5,
          igst: 0
        }
      );

      setSuccess(true);

      setTimeout(() => {
        router.push(`/${slug}/admin`);
      }, 1500);

    } catch (err: any) {
      console.error("Activation error:", err);

      if (err.code === "auth/email-already-in-use") {
        setError("Account already exists. Please login instead.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-600 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl p-10 lg:p-16 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6 shadow-xl shadow-orange-600/20">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">
            Activate DineByte
          </h1>
          <p className="text-gray-600 font-bold uppercase tracking-[0.2em] text-[10px]">
            Restaurant Onboarding Terminal
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center items-center gap-6 mb-10">
          {[1, 2].map((s) => (
            <div key={s} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${step === s ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' : 'bg-gray-200 text-gray-600'}`}>
                {s}
              </div>
              <span className="text-[10px] uppercase text-gray-600 font-bold mt-2">
                {s === 1 ? 'Basic Info' : 'Access Setup'}
              </span>
            </div>
          ))}
        </div>

        {success ? (
          <div className="text-center py-10">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              Activation Successful!
            </h2>
            <p className="text-gray-600 font-bold">
              Redirecting to your command center...
            </p>
          </div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-6">

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm font-bold border border-red-200">
                {error}
              </div>
            )}

            <AnimatePresence initial={false} mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Restaurant Name</label>
                    <div className="relative">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                      <input
                        required
                        type="text"
                        placeholder="e.g. Blue Lagoon Cafe"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Desired URL Slug</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                      <input
                        required
                        type="text"
                        placeholder="e.g. blue-lagoon"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            slug: e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, "-")
                          })
                        }
                        className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-gray-600 font-bold ml-1">Your URL: dinebyte.com/{formData.slug || 'your-slug'}</p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                    >
                      Next <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Admin Email</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                      <input
                        required
                        type="email"
                        placeholder="you@restaurant.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                          required
                          type="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                          required
                          type="password"
                          placeholder="••••••••"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              confirmPassword: e.target.value
                            })
                          }
                          className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-3 bg-gray-200 text-gray-800 rounded-2xl font-black text-sm uppercase tracking-widest shadow hover:bg-gray-300 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : 'Activate'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        )}

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-loose">
            By activating, you agree to DineByte's<br/>
            <span className="text-gray-800 cursor-pointer hover:text-orange-600 transition-colors">Terms of Service</span> & <span className="text-gray-800 cursor-pointer hover:text-orange-600 transition-colors">Privacy Policy</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}