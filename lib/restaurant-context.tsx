 "use client";
 
 import { createContext, useContext, ReactNode, useEffect, useState } from "react";
 import { useParams, useRouter } from "next/navigation";
 import { db } from "./firebase/config";
 import { doc, onSnapshot } from "firebase/firestore";
 
 interface Restaurant {
   id: string;
   slug: string;
   name: string;
   status: string;
   settings?: {
     upiId?: string;
   };
 }
 
 interface RestaurantContextType {
   restaurant: Restaurant | null;
   isLoading: boolean;
 }
 
 const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);
 
 export const RestaurantProvider = ({ children }: { children: ReactNode }) => {
  const params = useParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const slugParam = params?.slug;
   const slug: string | undefined = Array.isArray(slugParam)
     ? slugParam[0]
     : typeof slugParam === "string"
     ? slugParam
     : undefined;
 
   useEffect(() => {
     if (!slug) {
       setIsLoading(false);
       return;
     }

     setIsLoading(true);
     const unsub = onSnapshot(doc(db, "restaurants", slug), (docSnap) => {
       if (docSnap.exists()) {
         const data = docSnap.data();
         setRestaurant({
           id: docSnap.id,
           slug: docSnap.id,
           name: data.name,
           status: data.status,
           settings: data.settings || {},
         });
       } else {
         setRestaurant(null);
         // Proactive redirect if restaurant doesn't exist and we're in a slug route
         if (window.location.pathname.startsWith(`/${slug}`)) {
           // We might not want to redirect automatically here to avoid loops
           // but we can set loading false and let the components handle it
         }
       }
       setIsLoading(false);
     }, (err) => {
       console.error("Restaurant Fetch Error:", err);
       setIsLoading(false);
     });

     return () => unsub();
   }, [slug]);
 
   return (
     <RestaurantContext.Provider value={{ restaurant, isLoading }}>
       {children}
     </RestaurantContext.Provider>
   );
 };
 
 export const useRestaurant = () => {
   const context = useContext(RestaurantContext);
   if (!context) throw new Error("useRestaurant must be used within a RestaurantProvider");
   return context;
 };
