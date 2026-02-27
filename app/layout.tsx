import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../lib/cart-context";
import { AuthProvider } from "../lib/auth-context";
import { RestaurantProvider } from "../lib/restaurant-context";
import { TableProvider } from "../lib/table-context";
import { AdminProvider } from "../lib/admin-context";
import ThemeProvider from "../components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DineByte - Modern Restaurant Management",
  description: "Next-gen POS and Digital Ordering for Restaurants",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DineByte",
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <AdminProvider>
              <RestaurantProvider>
                <TableProvider>
                  <CartProvider>{children}</CartProvider>
                </TableProvider>
              </RestaurantProvider>
            </AdminProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
