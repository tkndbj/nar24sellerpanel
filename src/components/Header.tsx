"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useShop } from "@/context/ShopContext";
import { LogOut, Menu, X, ChevronDown, Store } from "lucide-react";
import FancyButton from "@/components/FancyButton";
import SellerInfoDrawer from "@/components/SellerInfoDrawer";

export default function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const router = useRouter();
  const { shops, selectedShop, loadingShops, switchShop } = useShop();
  const pathname = usePathname();

  if (pathname === "/") return null;
  if (pathname === "/productdetail") return null;

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  const handleShopSwitch = (shopId: string) => {
    switchShop(shopId);
    setIsShopDropdownOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-white shadow-lg px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-50">
        {/* Mobile Layout */}
        <div className="flex lg:hidden items-center justify-between w-full">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition"
          >
            NAR24
          </Link>

          {/* Shop Selector - Mobile */}
          <div className="flex-1 flex justify-center px-4">
            {!loadingShops && shops.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                >
                  <Store className="w-4 h-4" />
                  <span className="font-medium truncate max-w-[120px]">
                    {selectedShop?.name || "Select Shop"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isShopDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Mobile Shop Dropdown */}
                {isShopDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsShopDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-64 overflow-y-auto">
                      <div className="p-2">
                        {shops.map((shop) => (
                          <button
                            key={shop.id}
                            onClick={() => handleShopSwitch(shop.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              selectedShop?.id === shop.id
                                ? "bg-indigo-50 text-indigo-700 font-medium"
                                : "hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Store className="w-4 h-4" />
                              <span className="truncate">{shop.name}</span>
                              {selectedShop?.id === shop.id && (
                                <div className="w-2 h-2 bg-indigo-500 rounded-full ml-auto" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-between w-full">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition"
          >
            NAR24
          </Link>

          {/* Right controls */}
          <div className="flex items-center space-x-3 xl:space-x-4">
            {/* Dashboard action buttons - Smaller on medium screens */}
            <div className="flex items-center space-x-2">
              <FancyButton
                onClick={() => setIsDrawerOpen(true)}
                className="text-xs xl:text-sm px-3 xl:px-4 py-2"
              >
                Satıcı Bilgileri
              </FancyButton>
              <FancyButton
                href="/dashboard/products"
                className="text-xs xl:text-sm px-3 xl:px-4 py-2"
              >
                Kullanıcı Ayarları
              </FancyButton>
              <FancyButton
                href="/dashboard/stock"
                className="text-xs xl:text-sm px-3 xl:px-4 py-2"
              >
                Nakliyat Detayları
              </FancyButton>
              <FancyButton
                href="/dashboard/ads"
                className="text-xs xl:text-sm px-3 xl:px-4 py-2"
              >
                Vergi Detayları
              </FancyButton>
              <FancyButton
                href="/dashboard/orders"
                className="text-xs xl:text-sm px-3 xl:px-4 py-2"
              >
                Dükkan Görselleri
              </FancyButton>
            </div>

            {/* Desktop Shop switcher */}
            {!loadingShops && shops.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Store className="w-4 h-4" />
                  <span className="font-medium">
                    {selectedShop?.name || "Select Shop"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isShopDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Desktop Shop Dropdown */}
                {isShopDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsShopDropdownOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-64 overflow-y-auto">
                      <div className="p-2">
                        {shops.map((shop) => (
                          <button
                            key={shop.id}
                            onClick={() => handleShopSwitch(shop.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              selectedShop?.id === shop.id
                                ? "bg-indigo-50 text-indigo-700 font-medium"
                                : "hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Store className="w-4 h-4" />
                              <span>{shop.name}</span>
                              {selectedShop?.id === shop.id && (
                                <div className="w-2 h-2 bg-indigo-500 rounded-full ml-auto" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
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
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={closeMobileMenu}
          />
          <div className="fixed top-16 right-4 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 lg:hidden">
            <div className="p-4 space-y-2">
              <FancyButton
                onClick={() => {
                  setIsDrawerOpen(true);
                  closeMobileMenu();
                }}
                className="w-full justify-center text-sm"
              >
                Satıcı Bilgileri
              </FancyButton>
              <FancyButton
                href="/dashboard/products"
                className="w-full justify-center text-sm"
                onClick={closeMobileMenu}
              >
                Kullanıcı Ayarları
              </FancyButton>
              <FancyButton
                href="/dashboard/stock"
                className="w-full justify-center text-sm"
                onClick={closeMobileMenu}
              >
                Nakliyat Detayları
              </FancyButton>
              <FancyButton
                href="/dashboard/ads"
                className="w-full justify-center text-sm"
                onClick={closeMobileMenu}
              >
                Vergi Detayları
              </FancyButton>
              <FancyButton
                href="/dashboard/orders"
                className="w-full justify-center text-sm"
                onClick={closeMobileMenu}
              >
                Dükkan Görselleri
              </FancyButton>

              <hr className="my-3 border-gray-200" />

              <button
                onClick={() => {
                  handleLogout();
                  closeMobileMenu();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </>
      )}

      <SellerInfoDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
