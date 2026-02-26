"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "./auth-context";

interface AdminContextType {
  isAdmin: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { customer } = useAuth();
  // Simplified for demo: Any authenticated user can be an admin,
  // or you can check for a specific flag/ID in sessionStorage
  const isAdmin = true; // For development/demo purposes

  return (
    <AdminContext.Provider value={{ isAdmin }}>{children}</AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
