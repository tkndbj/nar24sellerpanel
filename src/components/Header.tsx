'use client';

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useShop } from "@/context/ShopContext";
import { LogOut } from "lucide-react";
import FancyButton from "@/components/FancyButton";
import SellerInfoDrawer from "@/components/SellerInfoDrawer";

export default function Header() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const { shops, selectedShop, loadingShops, switchShop } = useShop();
  const pathname = usePathname();
  if (pathname === "/") return null;
  if (pathname === "/productdetail") return null;

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-md px-6 py-4 flex items-center justify-between z-50">
      {/* Logo / Title */}
      <Link
        href="/dashboard"
        className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition"
      >
        NAR24
      </Link>

      {/* Right controls */}
      <div className="flex items-center space-x-4">
        {/* Dashboard action buttons */}
        <div className="hidden lg:flex items-center space-x-2">
        <FancyButton onClick={() => setIsDrawerOpen(true)}>Satıcı Bilgileri</FancyButton>
          <FancyButton href="/dashboard/products">Kullanıcı Ayarları</FancyButton>          
          <FancyButton href="/dashboard/stock">Nakliyat Detayları</FancyButton>
          <FancyButton href="/dashboard/ads">Vergi Detayları</FancyButton>
          <FancyButton href="/dashboard/orders">Dükkan Görselleri</FancyButton>
        </div>
        {/* Shop switcher */}
        {!loadingShops && shops.length > 0 && (
          <select
            value={selectedShop?.id}
            onChange={(e) => switchShop(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        )}
        

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title="Log out"
          className="p-2 rounded-full hover:bg-gray-100 transition"
        >
          <LogOut className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <SellerInfoDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </header>
  );
}
