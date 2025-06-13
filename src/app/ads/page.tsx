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
  DocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  Search,
  Filter,
  TrendingUp,
  BarChart3,
  Eye,
  ShoppingCart,
  Heart,
  Zap,
  Clock,
  ArrowUp,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Types
interface Product {
  id: string;
  productName: string;
  brandModel: string;
  price: number;
  currency: string;
  imageUrls: string[];
  colorImages?: Record<string, string[]>;
  category?: string;
  subcategory?: string;
  isBoosted?: boolean;
  boostEndTime?: Timestamp;
  clickCount: number;
  cartCount: number;
  favoritesCount: number;
  purchaseCount: number;
  boostedImpressionCount?: number;
  boostImpressionCountAtStart?: number;
  boostClickCountAtStart?: number;
  shopId?: string;
}



// Sample category data (you'll need to implement this based on your actual data)
const SAMPLE_CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home & Garden",
  "Sports",
  "Books",
  "Automotive",
];

const AdsPage = () => {
  const { selectedShop, loadingShops } = useShop();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showOnlyBoosted, setShowOnlyBoosted] = useState(false);
  
  // UI State
  const [showGraph, setShowGraph] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch products
  const fetchProducts = useCallback(async (loadMore = false) => {
    if (!selectedShop || loading) return;
    
    setLoading(true);
    try {
      let q = query(
        collection(db, "shop_products"),
        where("shopId", "==", selectedShop.id),
        orderBy("createdAt", "desc"),
        limit(20)
      );

      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      if (loadMore) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedShop, loading, lastDoc]);

  // Filter products
  const applyFilters = useCallback(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.productName.toLowerCase().includes(query) ||
          product.brandModel.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query) ||
          product.subcategory?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Subcategory filter
    if (selectedSubcategory) {
      filtered = filtered.filter(product => product.subcategory === selectedSubcategory);
    }

    // Boosted filter
    if (showOnlyBoosted) {
      filtered = filtered.filter(product => product.isBoosted);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, selectedSubcategory, showOnlyBoosted]);

  // Get boosted products for analytics
  const boostedProducts = useMemo(() => 
    filteredProducts.filter(p => p.isBoosted && p.boostEndTime), 
    [filteredProducts]
  );

  // Generate analytics data
  const analyticsData = useMemo(() => {
    return boostedProducts.map(product => {
      const impressions = (product.boostedImpressionCount || 0) - (product.boostImpressionCountAtStart || 0);
      const clicks = (product.clickCount || 0) - (product.boostClickCountAtStart || 0);
      
      return {
        productName: product.productName,
        impressions,
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0",
      };
    });
  }, [boostedProducts]);

  // Effects
  useEffect(() => {
    if (selectedShop) {
      fetchProducts();
    }
  }, [selectedShop, fetchProducts]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

 

  if (loadingShops) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedShop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 max-w-md">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Shop Selected</h2>
          <p className="text-gray-600">Please select a shop to view your ads and analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">
                Ads & Promotions
              </h1>
              <p className="text-gray-600 mt-1">{selectedShop.name}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGraph(!showGraph)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  showGraph 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                    : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:border-blue-300 transition-all"
              >
                <Filter className="w-4 h-4" />
                Filters
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={selectedCategory || ""}
                      onChange={(e) => setSelectedCategory(e.target.value || null)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Categories</option>
                      {SAMPLE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Boost Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Show Only</label>
                    <div className="flex items-center p-3 border border-gray-200 rounded-xl">
                      <input
                        type="checkbox"
                        id="boosted-filter"
                        checked={showOnlyBoosted}
                        onChange={(e) => setShowOnlyBoosted(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="boosted-filter" className="ml-2 text-sm text-gray-700">
                        Boosted Products
                      </label>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory(null);
                        setSelectedSubcategory(null);
                        setShowOnlyBoosted(false);
                      }}
                      className="w-full p-3 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Analytics Graph */}
        <AnimatePresence>
          {showGraph && boostedProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Boost Analytics
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {analyticsData.map((data, index) => (
                  <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <h4 className="font-semibold text-gray-900 mb-3 truncate">{data.productName}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Impressions
                        </span>
                        <span className="font-semibold text-blue-600">{data.impressions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <ArrowUp className="w-3 h-3" />
                          Clicks
                        </span>
                        <span className="font-semibold text-green-600">{data.clicks.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">CTR</span>
                        <span className="font-semibold text-purple-600">{data.ctr}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Grid */}
        <div className="space-y-6">
          {loading && products.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 rounded-2xl h-64 mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 max-w-md mx-auto">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Products Found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
  <ProductCard 
    key={product.id} 
    product={product} 
    shopId={selectedShop?.id} // Pass the selected shop ID
  />
))}
            </div>
          )}

          {/* Load More */}
          {hasMore && !loading && (
            <div className="text-center pt-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fetchProducts(true)}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
              >
                Load More Products
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Custom hook for countdown timer
const useCountdown = (endTime: Date) => {
    const [timeLeft, setTimeLeft] = useState("");
  
    useEffect(() => {
      // Handle invalid dates
      if (!endTime || endTime.getTime() === 0) {
        setTimeLeft("");
        return;
      }
  
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime.getTime() - now;
  
        if (distance < 0) {
          setTimeLeft("Expired");
          clearInterval(timer);
        } else {
          const hours = Math.floor(distance / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);
  
      return () => clearInterval(timer);
    }, [endTime]);
  
    return timeLeft;
  };

// Product Card Component
const ProductCard = ({ product, shopId }: { product: Product; shopId?: string }) => {
    const router = useRouter();
    
    // Always call the hook, but handle the conditional logic inside
    const endTime = product.boostEndTime ? product.boostEndTime.toDate() : new Date(0);
    const timeLeft = useCountdown(endTime);
    
    // Only show timer if product is actually boosted and has valid end time
    const shouldShowTimer = product.isBoosted && product.boostEndTime && timeLeft !== "Expired";
  
    const handleBoostProduct = () => {
      const params = new URLSearchParams({
        productId: product.id,
        isShopContext: "true",
        shopId: shopId || product.shopId || "",
      });
      
      router.push(`/boost?${params.toString()}`);
    };
  
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
      >
      {/* Boost Badge */}
      {product.isBoosted && (
        <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
          <Zap className="w-3 h-3" />
          Boosted
        </div>
      )}

      {/* Product Image */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {product.imageUrls && product.imageUrls.length > 0 ? (
          <Image
            src={product.imageUrls[0]}
            alt={product.productName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-gray-400">No Image</div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.productName}
        </h3>
        <p className="text-sm text-gray-600 mb-2">{product.brandModel}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-blue-600">
            {product.currency} {product.price.toLocaleString()}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {product.clickCount}
          </div>
          <div className="flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" />
            {product.cartCount}
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {product.favoritesCount}
          </div>
        </div>

        {/* Action Button or Timer */}
{shouldShowTimer ? (
  <div className="flex items-center justify-center gap-2 py-2 px-3 bg-green-50 border border-green-200 rounded-xl">
    <Clock className="w-4 h-4 text-green-600" />
    <span className="text-sm font-medium text-green-700">{timeLeft}</span>
  </div>
) : (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={handleBoostProduct} 
    className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
  >
    Ürünü Öne Çıkar
  </motion.button>
)}
      </div>
    </motion.div>
  );
};

export default AdsPage;