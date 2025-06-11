// src/app/productdetail/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import Image from "next/image";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import {
  ArrowLeft,
  Star,
  Eye,
  ShoppingCart,
  TrendingUp,
  Package,
  Calendar,
} from "lucide-react";

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

function ProductDetailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get("productId");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [maxQty, setMaxQty] = useState("");
  const [threshold, setThreshold] = useState("");
  const [discountPct, setDiscountPct] = useState("");

  // NEW: orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [buyerMap, setBuyerMap] = useState<Record<string, string>>({});
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!productId) {
      router.back();
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // 1) product
        const pSnap = await getDoc(doc(db, "shop_products", productId));
        if (!pSnap.exists()) {
          router.back();
          return;
        }
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
          const d = prefSnap.data();
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
        const ordersList = ordSnap.docs.map((d) => ({
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
        }));
        setOrders(ordersList);

        // 4) fetch buyer names
        const uniqueBuyers = Array.from(
          new Set(ordersList.map((o) => o.buyerId).filter(Boolean))
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

        setLoadingOrders(false);
        setLoading(false);
      } catch (error) {
        console.error("Error loading product:", error);
        setLoading(false);
      }
    })();
  }, [productId, router]);

  const savePrefs = async () => {
    if (!product || !productId) return;
    const ref = doc(
      db,
      "shop_products",
      productId,
      "sale_preferences",
      "preferences"
    );
    const payload: {
      maxQuantity?: number;
      discountThreshold?: number;
      discountPercentage?: number;
    } = {};
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
      alert("Eşik değeri maksimum miktarı aşamaz.");
      return;
    }
    if (Object.keys(payload).length) {
      await setDoc(ref, payload, { merge: true });
      alert("Tercihler kaydedildi!");
    } else {
      await deleteDoc(ref);
      alert("Tercihler temizlendi.");
    }
  };

  if (loading || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg font-medium">Ürün yükleniyor…</p>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Ürünlere Geri Dön</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Images Section */}
          <div className="space-y-6">
            <div className="relative group">
              <div className="aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-2xl">
                {selectedImage ? (
                  <Image
                    src={selectedImage}
                    alt={productName}
                    width={600}
                    height={600}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Package className="w-20 h-20 text-gray-300 mx-auto" />
                      <p className="text-gray-400 font-medium">
                        Resim bulunamadı
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {thumbnails.length > 0 && (
              <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                {thumbnails.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(url)}
                    className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden transition-all duration-300 ${
                      selectedImage === url
                        ? "ring-4 ring-indigo-500 shadow-lg scale-105"
                        : "ring-2 ring-gray-200 hover:ring-indigo-300 hover:shadow-md"
                    }`}
                  >
                    <Image
                      src={url}
                      alt={`thumbnail-${i}`}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-8">
            {/* Product Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  {productName}
                </h1>
                {brandModel && (
                  <p className="text-xl text-gray-600 mt-2 font-medium">
                    {brandModel}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-3xl sm:text-4xl font-bold text-indigo-600">
                  {price?.toFixed(0)} {currency}
                </div>
                {averageRating && averageRating > 0 && (
                  <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1 rounded-full">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="text-yellow-700 font-semibold">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<Package className="w-6 h-6" />}
                label="Stok"
                value={quantity ?? 0}
                color="blue"
              />
              <StatCard
                icon={<Eye className="w-6 h-6" />}
                label="Görüntülenme"
                value={clickCount ?? 0}
                color="green"
              />
              <StatCard
                icon={<ShoppingCart className="w-6 h-6" />}
                label="Sepete Ekleme"
                value={cartCount ?? 0}
                color="purple"
              />
              <StatCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Satılan"
                value={purchaseCount ?? 0}
                color="emerald"
                className="sm:col-span-1 col-span-2"
              />
            </div>

            {/* Sale Preferences */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                <span>Satış Tercihleri</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <InputField
                  label="Maksimum Miktar"
                  value={maxQty}
                  onChange={setMaxQty}
                  placeholder="örn. 100"
                />
                <InputField
                  label="İndirim Eşiği"
                  value={threshold}
                  onChange={setThreshold}
                  placeholder="örn. 10"
                />
                <InputField
                  label="İndirim %"
                  value={discountPct}
                  onChange={setDiscountPct}
                  placeholder="örn. 15"
                />
              </div>

              <button
                onClick={savePrefs}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-2xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Tercihleri Kaydet
              </button>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="mt-16">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-indigo-600" />
              <span>Son Siparişler</span>
            </h2>

            {loadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">
                  Siparişler yükleniyor…
                </span>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Bu ürün için sipariş bulunamadı.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-2xl shadow-lg">
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
                        ? new Date(o.timestamp.seconds * 1000).toLocaleString()
                        : "-";
                      const buyerName = o.buyerId ? buyerMap[o.buyerId] : "-";
                      const thumb =
                        o.selectedColorImage || o.productImage || "";
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
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">Yükleniyor...</p>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProductDetailContent />
    </Suspense>
  );
}

function StatCard({
  icon,
  label,
  value,
  color = "blue",
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: "blue" | "green" | "purple" | "emerald";
  className?: string;
}) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100 text-blue-700 border-blue-200",
    green: "from-green-50 to-green-100 text-green-700 border-green-200",
    purple: "from-purple-50 to-purple-100 text-purple-700 border-purple-200",
    emerald:
      "from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-4 border ${className}`}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/70"
        min={0}
      />
    </div>
  );
}
