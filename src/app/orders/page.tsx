"use client";

import React, { useState, useEffect } from "react";
import { useShop } from "@/context/ShopContext";
import { db } from "@/lib/firebase";
import Image from "next/image";
import {
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

type Order = {
  id: string;
  productId?: string;
  productName?: string;
  selectedColorImage?: string;
  productImage?: string;
  selectedColor?: string;
  selectedSize?: string;
  quantity?: number;
  price?: number;
  buyerId?: string;
  timestamp?: { seconds: number };
};

export default function OrdersPage() {
  const { selectedShop } = useShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [buyerMap, setBuyerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedShop) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // 1) fetch orders
        const q = query(
          collectionGroup(db, "items"),
          where("shopId", "==", selectedShop.id),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        const list: Order[] = snap.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => ({
            id: d.id,
            productId: d.data().productId,
            productName: d.data().productName,
            selectedColorImage: d.data().selectedColorImage,
            productImage: d.data().productImage,
            selectedColor: d.data().selectedColor,
            selectedSize: d.data().selectedSize,
            quantity: d.data().quantity,
            price: d.data().price,
            buyerId: d.data().buyerId,
            timestamp: d.data().timestamp,
          })
        );
        setOrders(list);

        // 2) fetch buyer names
        const uniqueBuyers = Array.from(
          new Set(list.map((o) => o.buyerId).filter(Boolean))
        );
        const map: Record<string, string> = {};
        await Promise.all(
          uniqueBuyers.map(async (uid) => {
            const u = await getDoc(doc(db, "users", uid!));
            const userData = u.data();
            map[uid!] = (u.exists() && userData?.displayName) || uid!;
          })
        );
        setBuyerMap(map);
      } catch (e) {
        const error = e as Error;
        setError(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedShop]);

  if (!selectedShop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <p className="text-gray-600 text-lg font-medium">
          Siparişleri görüntülemek için bir mağaza seçin.
        </p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
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
            Siparişler yükleniyor...
          </p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <p className="text-red-500 text-lg font-medium">Hata: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-24">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
          Siparişler — {selectedShop.name}
        </h1>

        {orders.length === 0 ? (
          <p className="text-gray-600 text-lg font-medium">
            Bu mağaza için sipariş bulunamadı.
          </p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-none sm:rounded-2xl shadow-lg w-full -mx-4 sm:mx-0">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Ürün
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Alıcı
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Renk
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Beden
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Adet
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Tutar
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => {
                  const date = o.timestamp
                    ? new Date(o.timestamp.seconds * 1000).toLocaleString(
                        "tr-TR"
                      )
                    : "-";
                  const buyerName = o.buyerId ? buyerMap[o.buyerId] : "-";
                  const thumb = o.selectedColorImage || o.productImage || "";
                  return (
                    <tr
                      key={o.id}
                      className={`transition-colors duration-200 hover:bg-gray-50 ${
                        idx < orders.length - 1
                          ? "border-b border-gray-200"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-800 flex items-center space-x-3">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt={o.productName || "Ürün"}
                            width={40}
                            height={40}
                            className="object-cover rounded-md shadow-sm"
                          />
                        ) : null}
                        <span className="font-medium">{o.productName}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {buyerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {o.selectedColor || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {o.selectedSize || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {o.quantity ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {(o.price ?? 0).toFixed(0)} TL
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}