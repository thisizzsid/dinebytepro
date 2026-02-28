"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { motion } from "framer-motion";
import {
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { db } from "../../lib/firebase/config";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";

export default function AuthPage() {
  const router = useRouter();
  const { customer, login, isLoading: isAuthLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    restaurantSlug: "",
    tableNumber: "",
    partySize: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (
      !isAuthLoading &&
      customer &&
      !isSuccess &&
      formData.restaurantSlug
    ) {
      router.push(`/${formData.restaurantSlug}/menu`);
    }
  }, [customer, isAuthLoading, router, isSuccess, formData.restaurantSlug]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (formData.name.trim().length < 2) {
      newErrors.name = "Full name must be at least 2 characters";
    }

    if (formData.phone.length < 10) {
      newErrors.phone = "Please enter a valid mobile number";
    }

    if (formData.restaurantSlug.trim().length === 0) {
      newErrors.restaurantSlug = "Enter restaurant slug (e.g., demo)";
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
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
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
      // 🔥 CHECK if restaurant exists
      const restaurantRef = doc(
        db,
        "restaurants",
        formData.restaurantSlug
      );
      const restaurantSnap = await getDoc(restaurantRef);

      if (!restaurantSnap.exists()) {
        setErrors({
          restaurantSlug: "Restaurant not found. Check slug.",
        });
        setIsSubmitting(false);
        return;
      }

      // ✅ Create customer inside restaurant
      const customerData = {
        name: formData.name,
        mobile: formData.phone,
        tableNumber: formData.tableNumber,
        partySize: formData.partySize,
        verified: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(
          db,
          "restaurants",
          formData.restaurantSlug,
          "customers"
        ),
        customerData
      );

      // Save in local auth context
      login({
        id: docRef.id,
        ...customerData,
        createdAt: Timestamp.now(),
      });

      setIsSuccess(true);

      setTimeout(() => {
        const query = new URLSearchParams({
          table: formData.tableNumber,
          party: String(formData.partySize),
        }).toString();

        router.push(
          `/${formData.restaurantSlug}/menu?${query}`
        );
      }, 1500);
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({
        global:
          "Failed to connect to the database. Please try again.",
      });
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
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Welcome!
          </h2>
          <p className="text-gray-500 font-bold mb-6">
            Let’s get you some chai.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col p-6 items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 border border-orange-100">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            DineByte
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">
            Digital Dining Experience
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {errors.global && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm font-bold">
              {errors.global}
            </div>
          )}

          <input
            type="text"
            placeholder="Your Name"
            value={formData.name}
            onChange={(e) =>
              handleInputChange("name", e.target.value)
            }
            className="w-full bg-gray-50 rounded-2xl p-4 font-bold"
          />

          <PhoneInput
            country={"in"}
            value={formData.phone}
            onChange={(val) =>
              handleInputChange("phone", val)
            }
          />

          <input
            type="text"
            placeholder="Restaurant Slug (e.g., lagoon)"
            value={formData.restaurantSlug}
            onChange={(e) =>
              handleInputChange(
                "restaurantSlug",
                e.target.value
              )
            }
            className="w-full bg-gray-50 rounded-2xl p-4 font-bold"
          />

          <input
            type="text"
            placeholder="Table Number"
            value={formData.tableNumber}
            onChange={(e) =>
              handleInputChange(
                "tableNumber",
                e.target.value
              )
            }
            className="w-full bg-gray-50 rounded-2xl p-4 font-bold"
          />

          <input
            type="number"
            min={1}
            placeholder="Party Size"
            value={formData.partySize}
            onChange={(e) =>
              handleInputChange(
                "partySize",
                parseInt(e.target.value || "1", 10)
              )
            }
            className="w-full bg-gray-50 rounded-2xl p-4 font-bold"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              <>
                START ORDERING <ArrowRight />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}