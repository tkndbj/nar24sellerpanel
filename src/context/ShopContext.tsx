// src/context/ShopContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

export type Shop = { id: string; name: string };
export type Metrics = {
  productViews: number;
  soldProducts: number;
  carts: number;
  favorites: number;
  shopViews: number;
  boosts: number;
};

type ShopContextType = {
  shops: Shop[];
  selectedShop: Shop | null;
  loadingShops: boolean;
  loadingMetrics: boolean;
  metrics: Metrics;
  switchShop: (shopId: string) => void;
  refreshMetrics: () => Promise<void>;
};

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    productViews: 0,
    soldProducts: 0,
    carts: 0,
    favorites: 0,
    shopViews: 0,
    boosts: 0,
  });

  // 1️⃣ Track Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  // 2️⃣ Fetch shops whenever the user object changes
  useEffect(() => {
    // if we're not signed in, clear and stop the spinner
    if (!user) {
      setShops([]);
      setSelectedShop(null);
      setLoadingShops(false);
      return;
    }

    setLoadingShops(true);
    const uid = user.uid;
    const queries = [
      query(collection(db, "shops"), where("ownerId", "==", uid)),
      query(collection(db, "shops"), where("editors", "array-contains", uid)),
      query(collection(db, "shops"), where("coOwners", "array-contains", uid)),
      query(collection(db, "shops"), where("viewers", "array-contains", uid)),
    ];

    Promise.all(queries.map((q) => getDocs(q)))
      .then((snaps) => {
        const docs = snaps.flatMap((s) => s.docs);
        const unique = Array.from(new Map(docs.map((d) => [d.id, d])).values());
        const list = unique.map<Shop>((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? "Unnamed Shop",
          };
        });
        setShops(list);
        if (!selectedShop && list.length) {
          setSelectedShop(list[0]);
        }
      })
      .finally(() => {
        setLoadingShops(false);
      });
  }, [user, selectedShop]);

  // 3️⃣ Fetch metrics for whichever shop is selected
  const fetchMetrics = useCallback(async () => {
    if (!user || !selectedShop) return;
    setLoadingMetrics(true);

    // product‐based aggregates
    const prodSnap = await getDocs(
      query(
        collection(db, "shop_products"),
        where("shopId", "==", selectedShop.id)
      )
    );
    let productViews = 0,
      soldProducts = 0,
      carts = 0,
      favorites = 0;
    prodSnap.forEach((p) => {
      const d = p.data();
      productViews += d.clickCount || 0;
      soldProducts += d.purchaseCount || 0;
      carts += d.cartCount || 0;
      favorites += d.favoritesCount || 0;
    });

    // shop views
    const shopSnap = await getDoc(doc(db, "shops", selectedShop.id));
    const shopViews = shopSnap.exists() ? shopSnap.data().clickCount || 0 : 0;

    // boost history count
    const boostSnap = await getDocs(
      collection(db, "users", user.uid, "boostHistory")
    );
    const boosts = boostSnap.size;

    setMetrics({
      productViews,
      soldProducts,
      carts,
      favorites,
      shopViews,
      boosts,
    });
    setLoadingMetrics(false);
  }, [user, selectedShop]);

  // re‐run when selectedShop or user changes
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const switchShop = (shopId: string) => {
    const shop = shops.find((s) => s.id === shopId) || null;
    setSelectedShop(shop);
  };

  return (
    <ShopContext.Provider
      value={{
        shops,
        selectedShop,
        loadingShops,
        loadingMetrics,
        metrics,
        switchShop,
        refreshMetrics: fetchMetrics,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
};
