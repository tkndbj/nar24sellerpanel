// src/app/productdetail/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  setDoc,
  deleteDoc,
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

type Product = {
  productName: string;
  brandModel?: string;
  price?: number;
  currency?: string;
  quantity?: number;
  averageRating?: number;
  clickCount?: number;
  cartCount?: number;
  purchaseCount?: number;
  imageUrls?: string[];
  colorImages?: Record<string, string[]>;
};

type Order = {
  id: string;
  quantity?: number;
  price?: number;
  timestamp?: { seconds: number };
};

export default function ProductDetailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get("productId")!;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [maxQty, setMaxQty] = useState("");
  const [threshold, setThreshold] = useState("");
  const [discountPct, setDiscountPct] = useState("");

  // NEW: orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) product
      const pSnap = await getDoc(doc(db, "shop_products", productId));
      if (!pSnap.exists()) return router.back();
      const data = pSnap.data() as Product;
      setProduct(data);
      setSelectedImage(
        data.imageUrls?.[0] ||
          Object.values(data.colorImages ?? {})[0]?.[0] ||
          null
      );

      // 2) sale prefs
      const prefSnap = await getDoc(
        doc(db, "shop_products", productId, "sale_preferences", "preferences")
      );
      if (prefSnap.exists()) {
        const d = prefSnap.data()!;
        if (d.maxQuantity) setMaxQty(String(d.maxQuantity));
        if (d.discountThreshold) setThreshold(String(d.discountThreshold));
        if (d.discountPercentage)
          setDiscountPct(String(d.discountPercentage));
      }

      // 3) orders for this product
      setLoadingOrders(true);
      const ordSnap = await getDocs(
        query(
          collectionGroup(db, "items"),
          where("productId", "==", productId),
          orderBy("timestamp", "desc")
        )
      );
      const ords = ordSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setOrders(ords);
      setLoadingOrders(false);

      setLoading(false);
    })();
  }, [productId, router]);

  const savePrefs = async () => {
    if (!product) return;
    const ref = doc(
      db,
      "shop_products",
      productId,
      "sale_preferences",
      "preferences"
    );
    const payload: any = {};
    const mq = parseInt(maxQty),
      th = parseInt(threshold),
      dp = parseInt(discountPct);
    if (mq > 0) payload.maxQuantity = mq;
    if (th > 0) payload.discountThreshold = th;
    if (dp > 0) payload.discountPercentage = dp;
    if (
      payload.discountThreshold &&
      payload.maxQuantity &&
      payload.discountThreshold > payload.maxQuantity
    ) {
      alert("Threshold cannot exceed max quantity.");
      return;
    }
    if (Object.keys(payload).length) {
      await setDoc(ref, payload, { merge: true });
      alert("Preferences saved!");
    } else {
      await deleteDoc(ref);
      alert("Preferences cleared.");
    }
  };

  if (loading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">Loading product…</p>
      </div>
    );
  }

  const {
    productName,
    brandModel,
    price,
    currency = "TL",
    quantity,
    averageRating,
    clickCount,
    cartCount,
    purchaseCount,
    imageUrls = [],
    colorImages = {},
  } = product;

  const thumbnails = [
    ...imageUrls,
    ...Object.values(colorImages).flat(),
  ].filter((u) => !!u);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl shadow-lg">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={productName}
                className="w-full h-[400px] object-cover transition-transform hover:scale-105"
              />
            ) : (
              <div className="w-full h-[400px] bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 3h12a1 1 0 011 1v12a1 1 0...
                  " />
                </svg>
              </div>
            )}
          </div>
          {thumbnails.length > 0 && (
            <div className="flex space-x-3 overflow-x-auto py-2">
              {thumbnails.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(url)}
                  className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                    selectedImage === url
                      ? "border-indigo-500 shadow-md"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <img
                    src={url}
                    alt={`thumb-${i}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details & Prefs */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold">{productName}</h1>
            {brandModel && <p className="mt-2 text-gray-500">{brandModel}</p>}
          </div>

          <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow-lg">
            <Stat label="Price" value={`${price?.toFixed(0)} ${currency}`} />
            <Stat label="Quantity" value={`${quantity ?? 0}`} />
            <Stat label="Rating" value={`${averageRating?.toFixed(1)}`} />
            <Stat label="Views" value={`${clickCount ?? 0}`} />
            <Stat label="In Carts" value={`${cartCount ?? 0}`} />
            <Stat label="Purchased" value={`${purchaseCount ?? 0}`} />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Sale Preferences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <InputField
                label="Max Quantity"
                value={maxQty}
                onChange={setMaxQty}
              />
              <InputField
                label="Discount Threshold"
                value={threshold}
                onChange={setThreshold}
              />
              <InputField
                label="Discount %"
                value={discountPct}
                onChange={setDiscountPct}
              />
            </div>
            <button
              onClick={savePrefs}
              className="mt-8 w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>

      {/* ── New: Orders Table ── */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Orders for this Product</h2>

        {loadingOrders ? (
          <p className="text-gray-500">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-600">No orders for this product.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o, idx) => (
              <React.Fragment key={o.id}>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-700">#{o.id}</span>
                  <span className="text-sm text-gray-700">
                    Qty: {o.quantity ?? "-"}
                  </span>
                  <span className="text-sm text-gray-700">
                    {(o.price ?? 0).toFixed(0)} TL
                  </span>
                  <span className="text-sm text-gray-500">
                    {o.timestamp
                      ? new Date(o.timestamp.seconds * 1000).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
                {idx < orders.length - 1 && <hr className="border-gray-200" />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="mt-1 text-lg font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
        min={0}
      />
    </div>
  );
}
