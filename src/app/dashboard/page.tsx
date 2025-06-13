"use client";

import React from "react";
import Link from "next/link";
import { useShop } from "@/context/ShopContext";
import {
  Eye,
  ShoppingBag,
  ShoppingCart,
  Heart,
  Store,
  Rocket,
  Package,
  FileText,
  Warehouse,
  Megaphone,
  Star,
  HelpCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { selectedShop, loadingShops, loadingMetrics, metrics } = useShop();

  // 1) While we're loading the list of shops…
  if (loadingShops) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <div className="flex items-center space-x-2">
          <svg
            className="animate-spin h-5 w-5 text-indigo-600"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-gray-600 text-lg font-medium">
            Loading your shops...
          </p>
        </div>
      </div>
    );
  }

  // 2) If the user has no shops at all
  if (!selectedShop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 pt-20">
        <p className="text-gray-700 text-lg font-medium mb-6">
          No shops found for your account.
        </p>
        <Link
          href="/dashboard/create-shop"
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Create your first shop
        </Link>
      </div>
    );
  }

  const metricCards = [
    { label: "Product Views", value: metrics.productViews, icon: Eye },
    { label: "Sold Products", value: metrics.soldProducts, icon: ShoppingBag },
    { label: "Carts", value: metrics.carts, icon: ShoppingCart },
    { label: "Favorites", value: metrics.favorites, icon: Heart },
    { label: "Shop Views", value: metrics.shopViews, icon: Store },
    { label: "Boosts", value: metrics.boosts, icon: Rocket },
  ];

  const overviewCards = [
    { label: "Products", href: "/products", icon: Package },
    { label: "Orders", href: "/orders", icon: FileText },
    { label: "Stock", href: "/stock", icon: Warehouse },
    { label: "Ads", href: "/ads", icon: Megaphone },
    { label: "Reviews", href: "/dashboard/reviews", icon: Star },
    {
      label: "Product Questions",
      href: "/dashboard/questions",
      icon: HelpCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        {/* Header + Shop Switcher */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Metrics for{" "}
            <span className="font-semibold text-indigo-600">
              {selectedShop.name}
            </span>
          </p>
        </header>

        {/* Top-level Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="relative bg-white rounded-2xl shadow-lg p-3 sm:p-6 hover:shadow-xl transition-shadow duration-200 overflow-hidden text-center sm:text-left"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <card.icon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 mb-2 sm:mb-4 mx-auto sm:mx-0" />
              <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                {card.label}
              </h3>
              <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-bold text-gray-900">
                {loadingMetrics ? (
                  <svg
                    className="animate-spin h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 mx-auto sm:mx-0"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  card.value ?? "—"
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Secondary Overview Cards */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6">
            {overviewCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="bg-white rounded-2xl shadow-lg p-3 sm:p-6 hover:shadow-xl transition-shadow duration-200 hover:bg-gray-50 text-center sm:text-left"
              >
                <card.icon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 mb-2 sm:mb-4 mx-auto sm:mx-0" />
                <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                  {card.label}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
