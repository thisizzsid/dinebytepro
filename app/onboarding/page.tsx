"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth, googleProvider } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import {
  Store,
  Globe,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Mail,
  Activity,
  ShieldAlert,
  BrainCircuit,
  IndianRupee,
  X
} from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // login toggle & fields
  const [isLogin, setIsLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({
    slug: "",
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showLegal, setShowLegal] = useState<'tos' | 'privacy' | null>(null);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (!formData.name || !formData.slug || !formData.username) {
      setError("Restaurant name, slug and username are required.");
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

      let uid: string;
      try {
        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        uid = userCredential.user.uid;
      } catch (authErr: any) {
        if (authErr.code === "auth/email-already-in-use") {
          // If user exists, try to sign in to verify they own the account
          try {
            const userCredential = await signInWithEmailAndPassword(
              auth,
              formData.email,
              formData.password
            );
            uid = userCredential.user.uid;
            // Check if this user already owns a restaurant
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists() && userDoc.data()?.restaurantSlug) {
              setError(`You already own a restaurant: ${userDoc.data().restaurantSlug}. Please login.`);
              setLoading(false);
              return;
            }
          } catch (loginErr: any) {
            setError("Account already exists with a different password. Please use a different email or login.");
            setLoading(false);
            return;
          }
        } else {
          throw authErr;
        }
      }

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
        username: formData.username,
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
      sessionStorage.setItem(`dinebyte_auth_${slug}`, "true");

      setTimeout(() => {
        router.push(`/${slug}/admin`);
      }, 1500);

    } catch (err: any) {
      console.error("Activation error:", err);

      if (err.code === "auth/email-already-in-use") {
        setError("Account already exists. Please login instead.");
        // switch to login mode so user can immediately attempt to signin
        setIsLogin(true);
        setLoginForm({
          slug: formData.slug,
          email: formData.email,
          password: ""
        });
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // check if user already has a restaurant
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.restaurantSlug) {
          router.push(`/${data.restaurantSlug}/admin`);
          return;
        }
      }

      // if not, we need them to complete step 1
      setIsLogin(false);
      setStep(1);
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));
      setError("Please complete your restaurant profile.");

    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError("Google sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const slug = loginForm.slug.trim().toLowerCase();
    if (!slug || !loginForm.email || !loginForm.password) {
      setError("Restaurant slug, email and password are required.");
      setLoading(false);
      return;
    }

    try {
      // authenticate
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginForm.email,
        loginForm.password
      );
      const user = userCredential.user;

      // verify restaurant slug belongs to this user
      const restroRef = doc(db, "restaurants", slug);
      const restroSnap = await getDoc(restroRef);
      if (!restroSnap.exists()) {
        setError("Restaurant not found. Check slug.");
        await signOut(auth);
        setLoading(false);
        return;
      }
      const data: any = restroSnap.data();
      if (data.adminUid && data.adminUid !== user.uid) {
        setError("This account is not associated with the provided restaurant slug.");
        await signOut(auth);
        setLoading(false);
        return;
      }

      // success, redirect
      router.push(`/${slug}/admin`);
    } catch (err: any) {
      console.error("Login error:", err);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side: DineByte Ad/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden items-center justify-center p-20 order-1">
        <div className="absolute top-0 right-0 w-full h-full opacity-30">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-orange-600 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>
        
        <div className="relative z-10 text-center max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-3 p-4">
              <img src="/moclogo.png" alt="DineByte Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-6xl font-black text-white tracking-tighter mb-6 leading-none uppercase italic">
              Dine<span className="text-orange-600">Byte</span>
            </h2>
            <p className="text-orange-500 font-black uppercase tracking-[0.5em] text-xs mb-10">Next-Gen Restaurant OS</p>
            
            <div className="grid grid-cols-2 gap-6 text-left">
              {[
                { icon: Activity, label: "Live Analytics", desc: "Real-time data synchronization across all terminals.", color: "text-orange-500", bg: "bg-orange-600/20" },
                { icon: ShieldAlert, label: "Fraud Shield", desc: "Military-grade geofencing and security protocols.", color: "text-blue-500", bg: "bg-blue-600/20" },
                { icon: BrainCircuit, label: "AI Insights", desc: "Predictive business intelligence powered by Gemini.", color: "text-purple-500", bg: "bg-purple-600/20" },
                { icon: IndianRupee, label: "Smart Billing", desc: "Automated ledger and digital invoice generation.", color: "text-emerald-500", bg: "bg-emerald-600/20" }
              ].map((feature, i) => (
                <div key={i} className="p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                  <div className={`w-10 h-10 ${feature.bg} rounded-xl flex items-center justify-center mb-4 ${feature.color} group-hover:scale-110 transition-transform`}>
                    <feature.icon size={20} />
                  </div>
                  <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-2">{feature.label}</h4>
                  <p className="text-gray-400 text-[9px] font-bold leading-relaxed uppercase tracking-wider">{feature.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-size-[40px_40px]" />
      </div>

      {/* Right Side: Onboarding Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative z-10 bg-white overflow-y-auto max-h-screen custom-scrollbar order-2">
        <div className="w-full max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center lg:text-left mb-10"
          >
            <div className="w-20 h-20 bg-orange-600 rounded-4xl flex items-center justify-center mb-8 rotate-6 shadow-2xl shadow-orange-600/20 group hover:rotate-0 transition-all duration-500 mx-auto lg:mx-0">
              <img src="/moclogo.png" alt="DineByte Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tighter uppercase italic">
              {isLogin ? (<>Welcome <span className="text-orange-600">Back</span></>) : (<>Activate <span className="text-orange-600">Restaurant</span></>)}
            </h1>
            <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] flex items-center justify-center lg:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" /> {isLogin ? 'Secure Admin Login' : 'Digital Onboarding Terminal'}
            </p>

            <div className="mt-6 flex justify-center lg:justify-start">
              {isLogin ? (
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError("");
                      setStep(1);
                      setFormData({
                        name: "",
                        slug: "",
                        username: "",
                        email: "",
                        password: "",
                        confirmPassword: ""
                      });
                    }}
                    className="text-orange-600 hover:underline cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              ) : (
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Already active?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError("");
                      setStep(1);
                    }}
                    className="text-orange-600 hover:underline cursor-pointer"
                  >
                    Admin Login
                  </button>
                </p>
              )}
            </div>
          </motion.div>

          {!isLogin && !success && (
            <div className="flex justify-center lg:justify-start items-center gap-6 mb-12">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-all duration-500 ${step === s ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 rotate-3' : 'bg-gray-100 text-gray-400'}`}>
                    {s}
                  </div>
                  <span className={`text-[9px] uppercase font-black tracking-widest ${step === s ? 'text-gray-900' : 'text-gray-400'}`}>
                    {s === 1 ? 'Business' : 'Security'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence initial={false} mode="wait">
            {isLogin ? (
              <motion.form
                key="login"
                onSubmit={handleLogin}
                className="space-y-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {error && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm font-bold border border-red-200">
                    {error}
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Restaurant Slug</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                      <input
                        required
                        type="text"
                        placeholder="e.g. blue-lagoon"
                        value={loginForm.slug}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, slug: e.target.value.toLowerCase() })
                        }
                        className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Admin Email</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                      <input
                        required
                        type="email"
                        placeholder="you@restaurant.com"
                        value={loginForm.email}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, email: e.target.value })
                        }
                        className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, password: e.target.value })
                        }
                        className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Login'}
                  </button>
                  
                  <div className="relative flex items-center py-2">
                    <div className="grow border-t border-gray-200"></div>
                    <span className="shrink mx-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">OR</span>
                    <div className="grow border-t border-gray-200"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-black text-sm uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Sign in with Google
                  </button>
                </div>
              </motion.form>
            ) : success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 0, y: -20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="text-center py-10"
              >
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  Activation Successful!
                </h2>
                <p className="text-gray-600 font-bold">
                  Redirecting to your command center...
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="signup"
                onSubmit={handleActivate}
                className="space-y-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {error && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm font-bold border border-red-200">
                    {error}
                  </div>
                )}

                <AnimatePresence initial={false} mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Restaurant Name</label>
                        <div className="relative">
                          <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                          <input
                            required
                            type="text"
                            placeholder="e.g. Blue Lagoon"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">URL Slug (URL Address)</label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                          <input
                            required
                            type="text"
                            placeholder="e.g. blue-lagoon"
                            value={formData.slug}
                            onChange={(e) =>
                              setFormData({ ...formData, slug: e.target.value })
                            }
                            className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                          />
                        </div>
                        <p className="text-[9px] text-gray-500 font-bold ml-1 uppercase tracking-widest">Address: dinebyte.com/{formData.slug || 'slug'}</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Admin Username</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                          <input
                            required
                            type="text"
                            placeholder="e.g. john_doe"
                            value={formData.username}
                            onChange={(e) =>
                              setFormData({ ...formData, username: e.target.value })
                            }
                            className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={!formData.name || !formData.slug || !formData.username}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        Next Step <ArrowRight size={18} />
                      </button>
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
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Confirm</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                              required
                              type="password"
                              placeholder="••••••••"
                              value={formData.confirmPassword}
                              onChange={(e) =>
                                setFormData({ ...formData, confirmPassword: e.target.value })
                              }
                              className="w-full bg-white border-2 border-gray-300 focus:border-orange-600 focus:ring-0 rounded-2xl py-3 pl-12 pr-4 text-gray-900 font-bold placeholder-gray-600 transition-all outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-2 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Activate'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-loose">
              By activating, you agree to DineByte's<br/>
              <button 
                type="button"
                onClick={() => setShowLegal('tos')}
                className="text-gray-800 cursor-pointer hover:text-orange-600 transition-colors"
              >
                Terms of Service
              </button> 
              & 
              <button 
                type="button"
                onClick={() => setShowLegal('privacy')}
                className="text-gray-800 cursor-pointer hover:text-orange-600 transition-colors"
              >
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Legal Modal */}
      <AnimatePresence>
        {showLegal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowLegal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                  {showLegal === 'tos' ? 'Terms of Service' : 'Privacy Policy'}
                </h2>
                <button 
                  onClick={() => setShowLegal(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Close Modal"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-sm text-gray-600 leading-relaxed font-medium">
                {showLegal === 'tos' ? (
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">1. System Usage</h3>
                      <p>DineByte is a restaurant operating system. By using our services, you agree to provide accurate business information and maintain the security of your admin credentials.</p>
                    </section>
                    <section>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">2. Data Security</h3>
                      <p>Admins are responsible for the data entered into the system, including customer dues and inventory records. DineByte provides the infrastructure but does not own your business data.</p>
                    </section>
                    <section>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">3. Prohibited Acts</h3>
                      <p>Any attempt to bypass geofencing, spoof location data, or reverse engineer the Command Center protocols is strictly prohibited.</p>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">1. Information Collection</h3>
                      <p>We collect restaurant business details, admin contact information, and operational logs (like geofencing validation) to provide a secure environment.</p>
                    </section>
                    <section>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">2. Geofencing Data</h3>
                      <p>Location data is used solely for order validation within the restaurant's designated radius and is not stored permanently beyond audit requirements.</p>
                    </section>
                    <section>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">3. Third-Party Services</h3>
                      <p>We use Firebase for authentication and database services, and Google for identity verification. Their respective privacy policies also apply.</p>
                    </section>
                  </div>
                )}
              </div>
              <div className="p-8 border-t border-gray-100">
                <button 
                  onClick={() => setShowLegal(null)}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all"
                >
                  I UNDERSTAND
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
