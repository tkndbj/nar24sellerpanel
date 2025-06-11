"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useShop } from "@/context/ShopContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import FancyButton from "@/components/FancyButton";

type Product = {
  id: string;
  productName: string;
  brandModel?: string;
  price?: number;
  imageUrl?: string;
  imageUrls?: string[];
  colorImages?: Record<string, string[]>;
  createdAt?: { seconds: number };
};

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const { selectedShop } = useShop();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch initial page
  const fetchInitial = useCallback(async () => {
    if (!selectedShop) return;
    setLoading(true);
    setProducts([]);
    setLastDoc(null);

    const q = query(
      collection(db, "shop_products"),
      where("shopId", "==", selectedShop.id),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const docs = snap.docs;
    setProducts(docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    setLastDoc(docs[docs.length - 1] ?? null);
    setHasMore(docs.length === PAGE_SIZE);
    setLoading(false);
  }, [selectedShop]);

  // Fetch more
  const fetchMore = useCallback(async () => {
    if (!selectedShop || !lastDoc) return;
    setLoadingMore(true);

    const q = query(
      collection(db, "shop_products"),
      where("shopId", "==", selectedShop.id),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const docs = snap.docs;
    setProducts((prev) => [
      ...prev,
      ...docs.map((d) => ({ id: d.id, ...d.data() } as Product)),
    ]);
    setLastDoc(docs[docs.length - 1] ?? null);
    setHasMore(docs.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [selectedShop, lastDoc]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Local search filter
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.brandModel ?? "").toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  if (!selectedShop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <p className="text-gray-600 text-lg font-medium">
          Select a shop to view its products.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 transition"
              title="Go back"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedShop.name} — Products
            </h1>
          </div>
          <div className="mt-6 flex items-center space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Ürün Listele button */}
            <FancyButton href="/listproduct" className="whitespace-nowrap">
              Ürün Listele
            </FancyButton>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-5 w-5 text-indigo-600 mr-2"
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
              Loading products...
            </p>
          </div>
        ) : (
          <>
            {filtered.length === 0 ? (
              <p className="text-gray-600 text-lg font-medium">
                No products found.
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filtered.map((prod) => {
                  const displayImage =
                    prod.imageUrl ||
                    prod.imageUrls?.[0] ||
                    Object.values(prod.colorImages ?? {})[0]?.[0] ||
                    "";

                  return (
                    <li key={prod.id}>
                      <Link
                        href={`/productdetail?productId=${prod.id}`}
                        className="flex items-center bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200 p-4"
                      >
                        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {displayImage ? (
                            <Image
                              src={displayImage}
                              alt={prod.productName}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg
                                className="w-10 h-10 text-gray-300"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm0 2v10h12V5H4zm2 1a1 1 0 100 2 1 1 0 000-2zm8 7H6l2-3 2 3 3-4 1 2v1z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <h2 className="text-lg font-semibold text-gray-900 truncate">
                            {prod.productName}
                          </h2>
                          {prod.brandModel && (
                            <p className="mt-1 text-sm text-gray-500">
                              {prod.brandModel}
                            </p>
                          )}
                          {prod.price != null && (
                            <p className="mt-2 text-lg font-bold text-indigo-600">
                              {prod.price.toFixed(0)} TL
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {hasMore && !loadingMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={fetchMore}
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Load More
                </button>
              </div>
            )}

            {loadingMore && (
              <div className="mt-10 flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 text-indigo-600 mr-2"
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
                  Loading more...
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
