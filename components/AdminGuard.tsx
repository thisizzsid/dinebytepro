"use client";

import { useAdmin } from "@/lib/admin-context";
import { useRouter } from "next/navigation";
import { useRestaurant } from "@/lib/restaurant-context";
import { ReactNode, useEffect } from "react";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdmin();
  const { restaurant, isLoading: isRestroLoading } = useRestaurant();
  const router = useRouter();

  useEffect(() => {
    if (!isRestroLoading) {
      if (!restaurant) {
        router.push("/onboarding");
        return;
      }
      if (!isAdmin) {
        router.push(`/${restaurant.slug}/menu`);
      }
    }
  }, [isAdmin, restaurant, isRestroLoading, router]);

  if (isRestroLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-6" />
        <p className="font-black text-white tracking-widest uppercase text-xl">Loading Terminal...</p>
      </div>
    );
  }

  if (!isAdmin || !restaurant) {
    return null;
  }

  return <>{children}</>;
}
