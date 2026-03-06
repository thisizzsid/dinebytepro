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
  Mail
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
          <div className="w-20 h-20 bg-white rounded-4xl flex items-center justify-center mx-auto mb-6 rotate-6 shadow-2xl shadow-orange-600/20 p-3 overflow-hidden border-2 border-orange-50">
            <img src="/moclogo.png" alt="DineByte Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tighter">
            {isLogin ? 'Welcome Back' : 'DineByte Activation'}
          </h1>
          <p className="text-gray-600 font-bold uppercase tracking-[0.2em] text-[10px]">
            {isLogin ? 'Restaurant Admin Login' : 'Restaurant Onboarding Terminal'}
          </p>

          <div className="mt-4">
            {isLogin ? (
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
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
                  className="text-orange-600 font-bold hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError("");
                    setStep(1);
                  }}
                  className="text-orange-600 font-bold hover:underline"
                >
                  Login
                </button>
              </p>
            )}
          </div>
        </div>

        {!isLogin && (
          <>
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
          </>
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
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
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
                  className="w-full py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-black text-sm uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
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
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1">Your Admin Username</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                      <input
                        required
                        type="text"
                        placeholder="e.g. admin_alex"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
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
      </motion.div>

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
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  title="Close Modal"
                  aria-label="Close Modal"
                >
                  <Globe size={24} className="text-gray-400" />
                </button>
              </div>
              <div className="p-10 overflow-y-auto custom-scrollbar text-gray-600 space-y-8 text-sm leading-relaxed">
                {showLegal === 'tos' ? (
                  <>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">1. Acceptance of Terms</h3>
                      <p>By accessing and using DineByte, you agree to comply with and be bound by these Terms of Service, aligned with the Information Technology Act, 2000 and other applicable Indian laws.</p>
                    </section>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">2. Service Description</h3>
                      <p>DineByte provides a SaaS platform for restaurant management, including digital menus, order tracking, and billing. We reserve the right to modify or discontinue services at any time.</p>
                    </section>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">3. User Obligations</h3>
                      <p>Users must provide accurate information during onboarding. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
                    </section>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">4. Payment Terms</h3>
                      <p>Subscription fees and transaction-related charges are governed by the specific plan selected. Payments are processed through authorized Indian payment gateways.</p>
                    </section>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">5. Governing Law</h3>
                      <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in New Delhi.</p>
                    </section>
                  </>
                ) : (
                  <>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">1. Data Collection</h3>
                      <p>We collect restaurant details, admin information, and customer order data necessary for providing our services, in compliance with the Digital Personal Data Protection Act (DPDP), 2023.</p>
                    </section>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">2. Use of Information</h3>
                      <p>Data is used to facilitate ordering, manage restaurant operations, and provide business insights via AI. We do not sell your personal data to third parties.</p>
                    </section>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">3. Data Security</h3>
                      <p>We implement industry-standard security measures, including encryption and secure cloud storage (Firebase), to protect your information from unauthorized access.</p>
                    </section>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">4. Cookies and Tracking</h3>
                      <p>We use essential cookies to maintain session states and provide a seamless user experience across the dashboard and digital menu.</p>
                    </section>
                    <section>
                      <h3 className="text-gray-900 font-black uppercase tracking-widest text-xs mb-4">5. Your Rights</h3>
                      <p>Users have the right to access, correct, or request deletion of their data. Contact our support for any privacy-related inquiries.</p>
                    </section>
                  </>
                )}
              </div>
              <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button 
                  onClick={() => setShowLegal(null)}
                  className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}