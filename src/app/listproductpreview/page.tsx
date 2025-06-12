"use client";

import React, { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User } from "firebase/auth";
import { useShop } from "@/context/ShopContext";

interface ProductData {
  title: string;
  description: string;
  price: string;
  quantity: string;
  condition: string;
  deliveryOption: string;
  category: string;
  subcategory: string;
  subsubcategory: string;
  brand: string;
  jewelryType: string;
  selectedMaterials: string[];
  selectedPantSizes: string[];
  selectedClothingSizes: string[];
  selectedClothingFit: string;
  selectedClothingType: string;
  selectedFootwearGender: string;
  selectedFootwearSizes: string[];
  selectedGender: string;
  selectedColors: { [key: string]: { quantity: string; image: File | null } };
  images: File[];
  video: File | null;
  phone: string;
  region: string;
  address: string;
  ibanOwnerName: string;
  ibanOwnerSurname: string;
  iban: string;
}

export default function ListProductPreview() {
  const router = useRouter();

  const [productData, setProductData] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const uid = user?.uid;
  const { selectedShop } = useShop();
  if (!selectedShop) throw new Error("No shop selected");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!initializing && !user) {
      router.push("/");
    }
  }, [initializing, user, router]);

  useEffect(() => {
    const savedData = sessionStorage.getItem("productPreviewData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);

        // Convert base64 back to File objects for images
        if (parsed.images) {
          const imageFiles = parsed.images.map(
            (img: { data: string; name: string; type: string }) => {
              const byteCharacters = atob(img.data.split(",")[1]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              return new File([byteArray], img.name, { type: img.type });
            }
          );
          parsed.images = imageFiles;
        }

        // Convert base64 back to File object for video
        if (parsed.video) {
          const byteCharacters = atob(parsed.video.data.split(",")[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          parsed.video = new File([byteArray], parsed.video.name, {
            type: parsed.video.type,
          });
        }

        // Convert color images back to File objects
        if (parsed.selectedColors) {
          const colorFiles: {
            [key: string]: { quantity: string; image: File | null };
          } = {};
          for (const [colorName, colorInfo] of Object.entries(
            parsed.selectedColors as {
              [key: string]: { quantity: string; imageData: string | null };
            }
          )) {
            if (colorInfo.imageData) {
              const byteCharacters = atob(colorInfo.imageData.split(",")[1]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const file = new File([byteArray], `${colorName}.jpg`, {
                type: "image/jpeg",
              });
              colorFiles[colorName] = {
                quantity: colorInfo.quantity,
                image: file,
              };
            } else {
              colorFiles[colorName] = {
                quantity: colorInfo.quantity,
                image: null,
              };
            }
          }
          parsed.selectedColors = colorFiles;
        }

        setProductData(parsed);
      } catch (error) {
        console.error("Error parsing saved data:", error);
        router.push("/listproduct");
      }
    } else {
      router.push("/listproduct");
    }
  }, [router]);

  // 2️⃣ Show a loading screen until we know the auth state
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Checking authentication…</p>
      </div>
    );
  }

  const handleEdit = () => {
    // Don't clear the data when going back to edit
    // sessionStorage data will remain for restoration
    router.push("/listproduct");
  };

  const handleConfirmAndList = async () => {
    if (!uid) {
      alert("Lütfen önce giriş yapın.");
      return;
    }

    setIsLoading(true);
    try {
      if (!productData) throw new Error("Missing preview data");
      const productId = crypto.randomUUID();

      // 1️⃣ upload main product images
      const mainImageUrls = await Promise.all(
        productData.images.map(async (file) => {
          const imgRef = storageRef(
            storage,
            `products/${uid}/default_images/${Date.now()}_${file.name}`
          );
          await uploadBytes(imgRef, file);
          return getDownloadURL(imgRef);
        })
      );

      // 2️⃣ upload optional video
      let videoUrl: string | null = null;
      if (productData.video) {
        const vidRef = storageRef(
          storage,
          `products/${uid}/preview_videos/${Date.now()}_${
            productData.video.name
          }`
        );
        await uploadBytes(vidRef, productData.video);
        videoUrl = await getDownloadURL(vidRef);
      }

      // 3️⃣ upload each selected‐color image AND collect their URLs
      const selectedColorsPayload: Record<
        string,
        { quantity: string; imageUrl: string | null }
      > = {};

      // Build colorImages for Flutter (Map<String, List<String>>)
      const colorImages: Record<string, string[]> = {};

      // Build colorQuantities for inventory management
      const colorQuantities: Record<string, number> = {};

      for (const [color, info] of Object.entries(productData.selectedColors)) {
        let imageUrl: string | null = null;
        if (info.image) {
          const colRef = storageRef(
            storage,
            `products/${uid}/color_images/${Date.now()}_${color}.jpg`
          );
          await uploadBytes(colRef, info.image);
          imageUrl = await getDownloadURL(colRef);

          // Add to colorImages in Flutter format
          if (imageUrl) {
            colorImages[color] = [imageUrl]; // Flutter expects array of URLs
          }
        }

        selectedColorsPayload[color] = {
          quantity: info.quantity,
          imageUrl,
        };

        // Add to colorQuantities
        if (info.quantity && parseInt(info.quantity) > 0) {
          colorQuantities[color] = parseInt(info.quantity);
        }
      }

      // 4️⃣ Create searchIndex as array (Flutter expects List<String>)
      const searchTerms = [
        productData.title.toLowerCase(),
        productData.description.toLowerCase(),
        productData.category.toLowerCase(),
        productData.subcategory.toLowerCase(),
        productData.subsubcategory.toLowerCase(),
        productData.brand.toLowerCase(),
        ...productData.selectedMaterials.map((m) => m.toLowerCase()),
        ...Object.keys(productData.selectedColors).map((c) => c.toLowerCase()),
      ].filter((term) => term.trim().length > 0);

      const searchIndexArray = Array.from(new Set(searchTerms));

      // 5️⃣ Get seller name - CRITICAL FIX HERE!
      let sellerName = "Unknown Seller";

      // 🔥 If shopId is present, use shop's name as seller name
      if (selectedShop?.id) {
        try {
          // First try to get shop's name from shop document
          const shopDoc = await getDoc(doc(db, "shops", selectedShop.id));
          if (shopDoc.exists()) {
            const shopData = shopDoc.data();
            sellerName =
              shopData?.name ||
              shopData?.shopName ||
              selectedShop.name ||
              "Unknown Shop";
          } else {
            // Fallback to selectedShop name from context
            sellerName = selectedShop.name || "Unknown Shop";
          }
        } catch (error) {
          console.warn("Error fetching shop name:", error);
          // Fallback to selectedShop name from context
          sellerName = selectedShop.name || "Unknown Shop";
        }
      } else {
        // Only fall back to user info if no shop is selected (which shouldn't happen in this flow)
        const userDoc = await getDoc(doc(db, "users", uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        sellerName =
          userData.displayName ||
          userData.name ||
          productData.ibanOwnerName ||
          "Unknown Seller";
      }

      // 6️⃣ Helper functions to ensure correct data types
      const ensureStringArray = (value: unknown): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map((v) => String(v));
        if (typeof value === "string") return value ? [value] : [];
        return [];
      };

      const ensureString = (value: unknown): string => {
        return value ? String(value) : "";
      };

      const ensureNumber = (value: unknown): number => {
        const num = parseFloat(value as string);
        return isNaN(num) ? 0 : num;
      };

      const ensureInteger = (value: unknown): number => {
        const num = parseInt(value as string);
        return isNaN(num) ? 0 : num;
      };

      // 7️⃣ Build complete Firestore payload matching Flutter Product model EXACTLY
      const applicationData = {
        // Core identification
        id: productId,
        productName: ensureString(productData.title),
        description: ensureString(productData.description),

        // Pricing (Flutter expects double)
        price: ensureNumber(productData.price),
        currency: "TL",
        originalPrice: null, // Not used in listing form
        discountPercentage: null, // Not used in listing form
        discountThreshold: null, // Not used in listing form

        // Product details
        condition: ensureString(productData.condition),
        brandModel: ensureString(productData.brand), // Flutter uses 'brandModel' field

        // Media arrays
        imageUrls: mainImageUrls, // Already array of strings
        videoUrl: videoUrl,
        colorImages: colorImages, // Map<String, List<String>>

        // Ratings and reviews
        averageRating: 0.0,
        reviewCount: 0,

        // User and ownership
        userId: uid,
        ownerId: uid,
        shopId: selectedShop.id,
        ilan_no: productId,

        // 🔥 CRITICAL FIX: Use shop name when shopId is present
        sellerName: sellerName,

        // Categories
        category: ensureString(productData.category),
        subcategory: ensureString(productData.subcategory),
        subsubcategory: ensureString(productData.subsubcategory),

        // Inventory
        quantity: ensureInteger(productData.quantity),
        colorQuantities: colorQuantities, // Map<String, int>
        sold: false,

        // Product-specific arrays (ensure they're arrays, not strings)
        jewelryType: ensureString(productData.jewelryType),
        jewelryMaterials: ensureStringArray(productData.selectedMaterials),
        clothingSizes: ensureStringArray(productData.selectedClothingSizes),
        clothingFit: ensureString(productData.selectedClothingFit),
        clothingType: ensureString(productData.selectedClothingType),
        pantSizes: ensureStringArray(productData.selectedPantSizes),
        footwearGender: ensureString(productData.selectedFootwearGender),
        footwearSizes: ensureStringArray(productData.selectedFootwearSizes),
        gender: ensureString(productData.selectedGender),

        // Delivery
        deliveryOption: ensureString(productData.deliveryOption),

        // Engagement metrics (integers)
        clickCount: 0,
        clickCountAtStart: 0,
        favoritesCount: 0,
        cartCount: 0,
        purchaseCount: 0,

        // Boost and ranking
        isFeatured: false,
        isTrending: false,
        isBoosted: false,
        boostedImpressionCount: 0,
        boostImpressionCountAtStart: 0,
        boostClickCountAtStart: 0,
        rankingScore: 0.0, // Flutter expects double
        dailyClickCount: 0,

        // Timestamps
        boostStartTime: null,
        boostEndTime: null,
        lastClickDate: null,
        createdAt: serverTimestamp(),

        // Search and status
        searchIndex: searchIndexArray, // Flutter expects List<String>, not string
        paused: false,
        bestSellerRank: null,

        // Admin and sync
        needsSync: true,
        updatedAt: serverTimestamp(),

        // Seller information for admin approval
        phone: ensureString(productData.phone),
        region: ensureString(productData.region),
        address: ensureString(productData.address),
        ibanOwnerName: ensureString(productData.ibanOwnerName),
        ibanOwnerSurname: ensureString(productData.ibanOwnerSurname),
        iban: ensureString(productData.iban),
      };

      // 8️⃣ Validate critical fields before saving
      if (!applicationData.productName) {
        throw new Error("Product name is required");
      }
      if (!applicationData.price || applicationData.price <= 0) {
        throw new Error("Valid price is required");
      }
      if (!applicationData.quantity || applicationData.quantity <= 0) {
        throw new Error("Valid quantity is required");
      }
      if (
        !applicationData.imageUrls ||
        applicationData.imageUrls.length === 0
      ) {
        throw new Error("At least one image is required");
      }

      // 9️⃣ Write to Firestore
      await setDoc(doc(db, "product_applications", productId), applicationData);

      sessionStorage.removeItem("productPreviewData");
      router.push("/success");
    } catch (err) {
      console.error("Error submitting product:", err);
      alert("Error submitting product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const DetailRow = ({ title, value }: { title: string; value: string }) => (
    <div className="flex justify-between items-start py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-slate-600 font-medium text-sm w-32 flex-shrink-0">
        {title}:
      </span>
      <span className="text-slate-800 text-sm text-right flex-1">{value}</span>
    </div>
  );

  const SectionCard = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon: string;
    children: React.ReactNode;
  }) => (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">{icon}</span>
        </div>
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </div>
  );

  if (!productData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Preview Your Product
            </h1>
            <p className="text-slate-600 text-lg">
              Review all details before submitting for approval
            </p>
          </div>

          <div className="space-y-8">
            {/* Media Gallery */}
            <SectionCard title="Media Gallery" icon="📸">
              <div className="space-y-6">
                {/* Images */}
                {productData.images.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-slate-700 mb-4">
                      Product Images ({productData.images.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {productData.images.map((file, idx) => (
                        <div
                          key={idx}
                          className="aspect-square relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <Image
                            src={URL.createObjectURL(file)}
                            alt={`Product image ${idx + 1}`}
                            fill
                            className="object-cover"
                            unoptimized={true}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video */}
                {productData.video && (
                  <div>
                    <h4 className="text-lg font-semibold text-slate-700 mb-4">
                      Product Video
                    </h4>
                    <div className="relative inline-block rounded-xl overflow-hidden shadow-lg">
                      <video
                        src={URL.createObjectURL(productData.video)}
                        controls
                        className="w-64 h-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Product Details */}
            <SectionCard title="Product Details" icon="📝">
              <DetailRow title="Title" value={productData.title} />
              <DetailRow title="Description" value={productData.description} />
              <DetailRow title="Price" value={`${productData.price} TL`} />
              <DetailRow title="Quantity" value={productData.quantity} />
              <DetailRow title="Condition" value={productData.condition} />
              <DetailRow
                title="Delivery Option"
                value={productData.deliveryOption}
              />
            </SectionCard>

            {/* Category & Classification */}
            <SectionCard title="Category & Classification" icon="🏷️">
              <DetailRow title="Category" value={productData.category} />
              {productData.subcategory && (
                <DetailRow
                  title="Subcategory"
                  value={productData.subcategory}
                />
              )}
              {productData.subsubcategory && (
                <DetailRow
                  title="Sub-Subcategory"
                  value={productData.subsubcategory}
                />
              )}
              {productData.brand && (
                <DetailRow title="Brand" value={productData.brand} />
              )}
            </SectionCard>

            {/* Product Specifications */}
            {(productData.jewelryType ||
              productData.selectedMaterials.length > 0 ||
              productData.selectedPantSizes.length > 0 ||
              productData.selectedClothingSizes.length > 0 ||
              productData.selectedFootwearSizes.length > 0 ||
              productData.selectedGender) && (
              <SectionCard title="Product Specifications" icon="⚙️">
                {/* Jewelry Specifications */}
                {productData.jewelryType && (
                  <DetailRow
                    title="Jewelry Type"
                    value={productData.jewelryType}
                  />
                )}
                {productData.selectedMaterials.length > 0 && (
                  <DetailRow
                    title="Materials"
                    value={productData.selectedMaterials.join(", ")}
                  />
                )}

                {/* Clothing Specifications */}
                {productData.selectedClothingSizes.length > 0 && (
                  <DetailRow
                    title="Clothing Sizes"
                    value={productData.selectedClothingSizes.join(", ")}
                  />
                )}
                {productData.selectedClothingFit && (
                  <DetailRow
                    title="Fit"
                    value={productData.selectedClothingFit}
                  />
                )}
                {productData.selectedClothingType && (
                  <DetailRow
                    title="Type"
                    value={productData.selectedClothingType}
                  />
                )}

                {/* Pant Specifications */}
                {productData.selectedPantSizes.length > 0 && (
                  <DetailRow
                    title="Pant Sizes"
                    value={productData.selectedPantSizes.join(", ")}
                  />
                )}

                {/* Footwear Specifications */}
                {productData.selectedFootwearGender && (
                  <DetailRow
                    title="Footwear Gender"
                    value={productData.selectedFootwearGender}
                  />
                )}
                {productData.selectedFootwearSizes.length > 0 && (
                  <DetailRow
                    title="Footwear Sizes"
                    value={productData.selectedFootwearSizes.join(", ")}
                  />
                )}

                {/* Gender */}
                {productData.selectedGender && (
                  <DetailRow
                    title="Target Gender"
                    value={productData.selectedGender}
                  />
                )}
              </SectionCard>
            )}

            {/* Color Options */}
            {Object.keys(productData.selectedColors).length > 0 && (
              <SectionCard title="Available Colors" icon="🎨">
                <div className="space-y-4">
                  {Object.entries(productData.selectedColors).map(
                    ([color, data]) => (
                      <div
                        key={color}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full border-2 border-white shadow-md bg-slate-300"></div>
                          <span className="font-medium text-slate-700">
                            {color}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {data.quantity && (
                            <span className="text-sm text-slate-600">
                              Qty: {data.quantity}
                            </span>
                          )}
                          {data.image && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden shadow-sm">
                              <Image
                                src={URL.createObjectURL(data.image)}
                                alt={`${color} variant`}
                                width={48}
                                height={48}
                                className="object-cover"
                                unoptimized={true}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </SectionCard>
            )}

            {/* Seller Information */}
            <SectionCard title="Seller Information" icon="👤">
              {/* If you have a full name field, you can render it here; otherwise you can omit this row */}
              {productData.ibanOwnerName && productData.ibanOwnerSurname && (
                <DetailRow
                  title="Account Owner"
                  value={`${productData.ibanOwnerName} ${productData.ibanOwnerSurname}`}
                />
              )}
              <DetailRow title="Phone" value={productData.phone} />
              <DetailRow title="Region" value={productData.region} />
              <DetailRow title="Address" value={productData.address} />
              <DetailRow title="IBAN" value={productData.iban} />
            </SectionCard>

            {/* Delivery Information */}
            <SectionCard title="Delivery Information" icon="🚚">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">
                    {productData.deliveryOption === "Fast Delivery"
                      ? "⚡"
                      : "🤝"}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800">
                    {productData.deliveryOption}
                  </h4>
                  <p className="text-slate-600 text-sm">
                    {productData.deliveryOption === "Fast Delivery"
                      ? "Fast and reliable delivery to your customers"
                      : "Self-managed delivery option"}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Important Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">⚠️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800 mb-2">
                    Important Notice
                  </h3>
                  <p className="text-amber-700 text-sm">
                    Your product will be reviewed by our team before being
                    published. This process usually takes 24-48 hours.
                    You&apos;ll receive a notification once your product is
                    approved and live on the platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <button
                onClick={handleEdit}
                className="flex-1 px-8 py-4 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-2xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 17l-5-5m0 0l5-5m-5 5h12"
                    />
                  </svg>
                  Edit Product
                </span>
              </button>

              <button
                onClick={handleConfirmAndList}
                disabled={isLoading || initializing}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Confirm & Submit for Review
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Submitting Product
            </h3>
            <p className="text-slate-600 text-sm">
              Please wait while we process your product listing...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
