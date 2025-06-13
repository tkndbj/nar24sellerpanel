"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useShop } from "@/context/ShopContext";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  ArrowLeft,
  CreditCard,
  Clock,  
  Search,
  Zap,
  TrendingUp,
  Eye,
  ShoppingCart,
  Heart,
  Target,
  Sparkles,
  Calendar,
  DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

// Types
interface Product {
    id: string;
    productName: string;
    brandModel: string;
    price: number;
    currency: string;
    imageUrls: string[];
    category?: string;
    subcategory?: string;
    userId?: string;
    shopId?: string;
    clickCount: number;
    cartCount: number;
    favoritesCount: number;
    purchaseCount: number;
    boostedImpressionCount?: number;
    isBoosted?: boolean;
    boostEndTime?: import('firebase/firestore').Timestamp; // Replace any with proper type
    collection?: string;
  }

interface BoostRequest {
  items: Array<{
    itemId: string;
    collection: string;
    shopId?: string;
  }>;
  boostDuration: number;
  isShopContext: boolean;
  shopId?: string;
}

interface BoostResponse {
    success: boolean;
    message: string;
    data: {
      boostedItemsCount: number;
      totalRequestedItems: number;
      boostDuration: number;
      boostStartTime: import('firebase/firestore').Timestamp; // Replace any
      boostEndTime: import('firebase/firestore').Timestamp; // Replace any
      totalPrice: number;
      pricePerItem: number;
      boostedItems: Array<{
        itemId: string;
        collection: string;
        shopId?: string;
      }>;
    };
  }

const BOOST_DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 35]; // minutes
const BASE_PRICE_PER_PRODUCT = 150.0; // TL per product per day
const JADE_GREEN = "#00A86B";


const BoostPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user] = useAuthState(auth);
  const { selectedShop } = useShop();

  // URL Parameters
  const productId = searchParams.get("productId");  
  const shopId = searchParams.get("shopId") || selectedShop?.id;

  // State
  const [mainProduct, setMainProduct] = useState<Product | null>(null);
  const [unboostedProducts, setUnboostedProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedDurationIndex, setSelectedDurationIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Computed values
  const boostDuration = BOOST_DURATION_OPTIONS[selectedDurationIndex];
  const itemCount = (mainProduct ? 1 : 0) + selectedProductIds.length;
  const totalPrice = boostDuration * BASE_PRICE_PER_PRODUCT * itemCount;

  // Initialize Firebase Functions
  const functions = getFunctions(undefined, 'europe-west3');
  const boostProducts = httpsCallable<BoostRequest, BoostResponse>(functions, 'boostProducts');

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return unboostedProducts;
    
    const query = searchQuery.toLowerCase();
    return unboostedProducts.filter(
      product =>
        product.productName.toLowerCase().includes(query) ||
        product.brandModel.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
    );
  }, [unboostedProducts, searchQuery]);

  // Fetch main product data
  const fetchMainProduct = useCallback(async () => {
    if (!productId || !user) return;

    try {
      // Since web app only has shop products, only check shop_products collection
      const shopProductsDoc = await getDoc(doc(db, "shop_products", productId));

      if (!shopProductsDoc.exists()) {
        throw new Error("Product not found");
      }

      const data = shopProductsDoc.data() as Product;
      setMainProduct({
        ...data,
        id: shopProductsDoc.id,
        collection: "shop_products",
      });
    } catch (error) {
      console.error("Error fetching main product:", error);
      // Show error and redirect back
      router.back();
    }
  }, [productId, user, router]);

  // Fetch unboosted products
  const fetchUnboostedProducts = useCallback(async () => {
    if (!user || !shopId) return;

    try {
      // Since web app only has shop products, only query shop_products
      const q = query(
        collection(db, "shop_products"),
        where("shopId", "==", shopId),
        where("isBoosted", "==", false),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const products = snapshot.docs
        .map(doc => ({
          ...doc.data(),
          id: doc.id,
          collection: "shop_products",
        } as Product))
        .filter(product => product.id !== productId); // Exclude main product

      setUnboostedProducts(products);
    } catch (error) {
      console.error("Error fetching unboosted products:", error);
    }
  }, [user, shopId, productId]);

  // Initialize data
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      
      const promises = [];
      if (productId) {
        promises.push(fetchMainProduct());
      }
      promises.push(fetchUnboostedProducts());
      
      await Promise.all(promises);
      setLoading(false);
    };
  
    if (user) {
      initialize();
    }
  }, [user, productId, fetchMainProduct, fetchUnboostedProducts]);

  // Process payment and boost products using Cloud Function
  const proceedToPayment = async () => {
    if (!user) {
      alert("User not authenticated");
      return;
    }

    if (!mainProduct && selectedProductIds.length === 0) {
      alert("No items to boost");
      return;
    }

    if (!shopId) {
      alert("Shop ID is required");
      return;
    }

    setProcessing(true);

    try {
      // Prepare items for the cloud function
      const items: Array<{ itemId: string; collection: string; shopId: string }> = [];
      
      // Add main product if exists
      if (mainProduct) {
        items.push({
          itemId: mainProduct.id,
          collection: "shop_products",
          shopId: mainProduct.shopId || shopId,
        });
      }
      
      // Add selected products
      for (const productId of selectedProductIds) {
        const product = unboostedProducts.find(p => p.id === productId);
        if (product) {
          items.push({
            itemId: product.id,
            collection: "shop_products",
            shopId: product.shopId || shopId,
          });
        }
      }

      if (items.length === 0) {
        alert("No valid items to boost");
        setProcessing(false);
        return;
      }

      // Call the cloud function
      const request: BoostRequest = {
        items,
        boostDuration,
        isShopContext: true, // Always true for web app
        shopId,
      };

      console.log("Calling boostProducts cloud function with:", request);

      const result = await boostProducts(request);
      
      console.log("Cloud function response:", result.data);

      if (result.data.success) {
        // Show success dialog
        showSuccessDialog(result.data.data); // Pass result.data.data instead of result.data
      } else {
        throw new Error(result.data.message || "Failed to boost products");
      }
    } catch (error) {
      console.error("Error processing boost:", error);
      
      // Extract error message
      let errorMessage = "Error processing boost. Please try again.";
if (error && typeof error === 'object' && 'message' in error) {
  errorMessage = (error as Error).message;
}
      
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Success dialog
  const showSuccessDialog = (data: BoostResponse['data']) => {
    // Enhanced success dialog with more details
    const message = `🎉 Boost Completed!

Successfully boosted your products!

Details:
• ${data.boostedItemsCount} items boosted successfully
• Duration: ${data.boostDuration} minutes
• Total cost: ${data.totalPrice.toFixed(2)} TL

Your products will now appear in the featured section.

Click OK to continue.`;

    const confirmed = window.confirm(message);
    
    if (confirmed) {
      // Since web app only has shop products, always go to ads page
      router.push("/ads");
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading boost options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">
                  Boost Products
                </h1>
                <p className="text-gray-600 text-sm">Increase visibility and reach</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">{itemCount} item{itemCount !== 1 ? 's' : ''} selected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Main Product Section */}
          {mainProduct && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Primary Product</h3>
                </div>
                
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    {mainProduct.imageUrls?.[0] ? (
                      <Image
                        src={mainProduct.imageUrls[0]}
                        alt={mainProduct.productName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Sparkles className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{mainProduct.productName}</h4>
                    <p className="text-sm text-gray-600 mb-2">{mainProduct.brandModel}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {mainProduct.clickCount || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        {mainProduct.cartCount || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {mainProduct.favoritesCount || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* Additional Products Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Add More Products</h3>
                </div>
                
                <div className="text-sm text-gray-600">
                  {selectedProductIds.length} of {filteredProducts.length} selected
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Products List */}
              <div className="max-h-80 overflow-y-auto space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No products available to boost</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer hover:bg-gray-50 ${
                        selectedProductIds.includes(product.id)
                          ? "border-green-200 bg-green-50"
                          : "border-gray-100"
                      }`}
                      onClick={() => toggleProductSelection(product.id)}
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => {}} // Handled by parent click
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </div>
                      
                      <div className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.imageUrls?.[0] ? (
                          <Image
                            src={product.imageUrls[0]}
                            alt={product.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Sparkles className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{product.productName}</h4>
                        <p className="text-sm text-gray-500 truncate">{product.brandModel}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.section>

          {/* Boost Duration Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Boost Duration</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>5 minutes</span>
                  <span>35 minutes</span>
                </div>
                
                <input
                  type="range"
                  min={0}
                  max={BOOST_DURATION_OPTIONS.length - 1}
                  value={selectedDurationIndex}
                  onChange={(e) => setSelectedDurationIndex(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, ${JADE_GREEN} 0%, ${JADE_GREEN} ${(selectedDurationIndex / (BOOST_DURATION_OPTIONS.length - 1)) * 100}%, #e5e7eb ${(selectedDurationIndex / (BOOST_DURATION_OPTIONS.length - 1)) * 100}%, #e5e7eb 100%)`
                  }}
                />
                
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {boostDuration} minutes
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Pricing Summary */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl border border-orange-200 shadow-sm"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Pricing Summary</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Base price per product</span>
                  <span className="font-medium">{BASE_PRICE_PER_PRODUCT} TL</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{boostDuration} minutes</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Number of products</span>
                  <span className="font-medium">{itemCount}</span>
                </div>
                <div className="border-t border-orange-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Price</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                      {totalPrice.toFixed(2)} TL
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      {/* Bottom Payment Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={proceedToPayment}
            disabled={processing || itemCount === 0}
            className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-semibold text-lg transition-all ${
              processing || itemCount === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-600/30"
            }`}
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Complete Payment ({totalPrice.toFixed(2)} TL)
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Add some bottom padding to account for fixed button */}
      <div className="h-24"></div>
    </div>
  );
};

export default BoostPage;