"use client";

import React, { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

  const handleEdit = () => {
    // Don't clear the data when going back to edit
    // sessionStorage data will remain for restoration
    router.push("/listproduct");
 };

 const handleConfirmAndList = async () => {
  setIsLoading(true);
  try {
    if (!productData) {
      alert("Ürün verisi eksik, lütfen yeniden deneyin.");
      setIsLoading(false);
      return;
    }
    // now TS knows productData is non-null
    const data = productData;

    // 1️⃣ Generate ID
    const productId = crypto.randomUUID();

    // 2️⃣ Ensure user
    const user = auth.currentUser;
    if (!user) throw new Error("You must be signed in…");

    // 3️⃣ Upload images
    const imageUrls = await Promise.all(
      data.images.map(async (file) => {
        const imgRef = storageRef(
          storage,
          `products/${user.uid}/default_images/${Date.now()}_${file.name}`
        );
        await uploadBytes(imgRef, file);
        return getDownloadURL(imgRef);
      })
    );

    // 4️⃣ Video
    let videoUrl: string | null = null;
    if (data.video) {
      const vidRef = storageRef(
        storage,
        `products/${user.uid}/preview_videos/${Date.now()}_${data.video.name}`
      );
      await uploadBytes(vidRef, data.video);
      videoUrl = await getDownloadURL(vidRef);
    }

    // 5️⃣ Firestore payload
    const applicationData = {
      ...data,
      imageUrls,
      videoUrl,
      ownerId: user.uid,
      needsSync: true,
      updatedAt: serverTimestamp(),
    };

    // 6️⃣ Write to Firestore
    await setDoc(doc(db, "product_applications", productId), applicationData);

    // 7️⃣ Done
    sessionStorage.removeItem("productPreviewData");
    router.push("/success");
  } catch (err) {
    console.error(err);
    alert("Hata oluştu. Lütfen tekrar deneyin.");
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
  <DetailRow title="Phone"   value={productData.phone}   />
  <DetailRow title="Region"  value={productData.region}  />
  <DetailRow title="Address" value={productData.address} />
  <DetailRow title="IBAN"    value={productData.iban}    />
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
                disabled={isLoading}
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
