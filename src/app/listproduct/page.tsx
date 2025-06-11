"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

// TODO: Replace these imports with your real data/constants
import {
  categories,
  subcategoriesMap,
  subSubcategoriesMap,
  brandsByCategory,
  jewelryTypes,
  jewelryMaterials,
  pantSizesByCategory,
  clothingSizes,
  clothingFits,
  clothingTypes,
  footwearSizesByCategory,
  colorOptions,
} from "@/constants/productData";

export default function ListProductForm() {
  // Media
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);

  // Basic info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [condition, setCondition] = useState("");
  const [deliveryOption, setDeliveryOption] = useState("");

  // Flow state
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [subsubcategory, setSubsubcategory] = useState("");
  const [brand, setBrand] = useState("");

  // Jewelry flow
  const [jewelryType, setJewelryType] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  // Pant flow
  const [selectedPantSizes, setSelectedPantSizes] = useState<string[]>([]);

  // Clothing flow
  const [selectedClothingSizes, setSelectedClothingSizes] = useState<string[]>(
    []
  );
  const [selectedClothingFit, setSelectedClothingFit] = useState("");
  const [selectedClothingType, setSelectedClothingType] = useState("");

  // Footwear flow
  const [selectedFootwearGender, setSelectedFootwearGender] = useState("");
  const [selectedFootwearSizes, setSelectedFootwearSizes] = useState<string[]>(
    []
  );

  // Gender + Colors
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedColors, setSelectedColors] = useState<{
    [key: string]: { quantity: string; image: File | null };
  }>({});

  // UI State
  const [dragActive, setDragActive] = useState(false);

  // Handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files] as File[]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const videoFiles = files.filter((file) => file.type.startsWith("video/"));

    if (imageFiles.length > 0) {
      setImages((prev) => [...prev, ...imageFiles] as File[]);
    }
    if (videoFiles.length > 0 && !video) {
      setVideo(videoFiles[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideo(e.target.files?.[0] ?? null);
  };
  const removeVideo = () => setVideo(null);

  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const savedData = sessionStorage.getItem("productPreviewData");
    if (savedData) {
      try {
        setIsRestoring(true); // Set flag to prevent clearing during restoration

        const parsed = JSON.parse(savedData);

        // Restore basic info
        setTitle(parsed.title || "");
        setDescription(parsed.description || "");
        setPrice(parsed.price || "");
        setQuantity(parsed.quantity || "1");
        setCondition(parsed.condition || "");
        setDeliveryOption(parsed.deliveryOption || "");

        // Restore categories
        setCategory(parsed.category || "");
        setSubcategory(parsed.subcategory || "");
        setSubsubcategory(parsed.subsubcategory || "");
        setBrand(parsed.brand || "");

        // Restore jewelry data
        setJewelryType(parsed.jewelryType || "");
        setSelectedMaterials(parsed.selectedMaterials || []);

        // Restore clothing data
        setSelectedPantSizes(parsed.selectedPantSizes || []);
        setSelectedClothingSizes(parsed.selectedClothingSizes || []);
        setSelectedClothingFit(parsed.selectedClothingFit || "");
        setSelectedClothingType(parsed.selectedClothingType || "");

        // Restore footwear data
        setSelectedFootwearGender(parsed.selectedFootwearGender || "");
        setSelectedFootwearSizes(parsed.selectedFootwearSizes || []);

        // Restore gender
        setSelectedGender(parsed.selectedGender || "");

        // Restore images
        if (parsed.images && parsed.images.length > 0) {
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
          setImages(imageFiles);
        }

        // Restore video
        if (parsed.video) {
          const byteCharacters = atob(parsed.video.data.split(",")[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const videoFile = new File([byteArray], parsed.video.name, {
            type: parsed.video.type,
          });
          setVideo(videoFile);
        }

        // Restore colors
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
          setSelectedColors(colorFiles);
        }

        // Clear the restoration flag after a short delay
        setTimeout(() => {
          setIsRestoring(false);
        }, 100);
      } catch (error) {
        console.error("Error restoring data:", error);
        setIsRestoring(false);
      }
    }
  }, []);

  // Updated reset useEffect hooks - only clear if not restoring
  useEffect(() => {
    if (!isRestoring) {
      setSubcategory("");
      setSubsubcategory("");
      setBrand("");
      setJewelryType("");
      setSelectedMaterials([]);
      setSelectedPantSizes([]);
      setSelectedClothingSizes([]);
      setSelectedClothingFit("");
      setSelectedClothingType("");
      setSelectedFootwearGender("");
      setSelectedFootwearSizes([]);
      setSelectedGender("");
      setSelectedColors({});
    }
  }, [category, isRestoring]);

  useEffect(() => {
    if (!isRestoring) {
      setSubsubcategory("");
      setBrand("");
      setJewelryType("");
      setSelectedMaterials([]);
      setSelectedPantSizes([]);
      setSelectedClothingSizes([]);
      setSelectedClothingFit("");
      setSelectedClothingType("");
      setSelectedFootwearGender("");
      setSelectedFootwearSizes([]);
      setSelectedGender("");
      setSelectedColors({});
    }
  }, [subcategory, isRestoring]);

  useEffect(() => {
    if (!isRestoring) {
      setBrand("");
      setJewelryType("");
      setSelectedMaterials([]);
      setSelectedPantSizes([]);
      setSelectedClothingSizes([]);
      setSelectedClothingFit("");
      setSelectedClothingType("");
      setSelectedFootwearGender("");
      setSelectedFootwearSizes([]);
      setSelectedGender("");
      setSelectedColors({});
    }
  }, [subsubcategory, isRestoring]);

  // Color handlers
  const toggleColor = (color: string) => {
    setSelectedColors((prev) => {
      const copy = { ...prev };
      if (copy[color]) delete copy[color];
      else copy[color] = { quantity: "", image: null };
      return copy;
    });
  };
  const handleColorQuantity = (color: string, qty: string) => {
    setSelectedColors((prev) => ({
      ...prev,
      [color]: { ...prev[color], quantity: qty },
    }));
  };
  const handleColorImage = (color: string, file: File | null) => {
    setSelectedColors((prev) => ({
      ...prev,
      [color]: { ...prev[color], image: file },
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      alert("Please enter a product title");
      return;
    }

    if (!description.trim()) {
      alert("Please enter a product description");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      alert("Please enter a valid price");
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    if (!condition) {
      alert("Please select a product condition");
      return;
    }

    if (!deliveryOption) {
      alert("Please select a delivery option");
      return;
    }

    if (!category || !subcategory || !subsubcategory) {
      alert("Please complete the category selection");
      return;
    }

    if (images.length === 0) {
      alert("Please upload at least one product image");
      return;
    }

    try {
      // Convert files to base64 or blob URLs for storage
      const imageData = await Promise.all(
        images.map(async (file, index) => {
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: reader.result as string,
                index,
              });
            reader.readAsDataURL(file);
          });
        })
      );

      let videoData = null;
      if (video) {
        const reader = new FileReader();
        videoData = await new Promise((resolve) => {
          reader.onload = () =>
            resolve({
              name: video.name,
              type: video.type,
              size: video.size,
              data: reader.result as string,
            });
          reader.readAsDataURL(video);
        });
      }

      // Convert color images to base64
      const colorData: {
        [key: string]: { quantity: string; imageData: string | null };
      } = {};
      for (const [colorName, colorInfo] of Object.entries(selectedColors)) {
        if (colorInfo.image) {
          const reader = new FileReader();
          const imageData = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(colorInfo.image!);
          });
          colorData[colorName] = {
            quantity: colorInfo.quantity,
            imageData: imageData,
          };
        } else {
          colorData[colorName] = {
            quantity: colorInfo.quantity,
            imageData: null,
          };
        }
      }

      // Prepare data for preview
      const productData = {
        title: title.trim(),
        description: description.trim(),
        price,
        quantity,
        condition,
        deliveryOption,
        category,
        subcategory,
        subsubcategory,
        brand,
        jewelryType,
        selectedMaterials,
        selectedPantSizes,
        selectedClothingSizes,
        selectedClothingFit,
        selectedClothingType,
        selectedFootwearGender,
        selectedFootwearSizes,
        selectedGender,
        selectedColors: colorData,
        images: imageData,
        video: videoData,
      };

      // Store the product data
      sessionStorage.setItem("productPreviewData", JSON.stringify(productData));

      // Navigate to preview page using Next.js router
      window.location.href = "/listproductpreview";
    } catch (error) {
      console.error("Error preparing data:", error);
      alert("Error preparing data for preview. Please try again.");
    }
  };

  const UploadIcon = () => (
    <svg
      className="w-12 h-12 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );

  const VideoIcon = () => (
    <svg
      className="w-8 h-8 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 pt-24 pb-12">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8">
          {/* Media Upload Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📸</span>
              </div>
              Media Gallery
            </h2>

            {/* Drag & Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? "border-blue-500 bg-blue-50/50 scale-[1.02]"
                  : "border-slate-300 hover:border-blue-400 hover:bg-slate-50/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <UploadIcon />
              <h3 className="text-lg font-semibold text-slate-700 mt-4">
                Drop your images here
              </h3>
              <p className="text-slate-500 mt-2">or click to browse</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-semibold text-slate-700 mb-4">
                  Uploaded Images ({images.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {images.map((file, idx) => (
                    <div key={idx} className="group relative aspect-square">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        width={200}
                        height={200}
                        className="w-full h-full object-cover rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300"
                        unoptimized={true}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-100 hover:opacity-90 transition-all duration-200 flex items-center justify-center z-20"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Upload */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <VideoIcon />
                <h4 className="text-lg font-semibold text-slate-700">
                  Video (Optional)
                </h4>
              </div>

              {!video ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-slate-50/50 transition-all duration-300">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <VideoIcon />
                  <p className="text-slate-600 mt-2">Upload a product video</p>
                </div>
              ) : (
                <div className="relative inline-block">
                  <video
                    src={URL.createObjectURL(video)}
                    controls
                    className="w-64 h-auto rounded-xl shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center z-20 hover:scale-110"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📝</span>
              </div>
              Product Details
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Product Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value as string)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="Enter a descriptive title for your product"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value as string)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm resize-none"
                  placeholder="Describe your product in detail..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Price (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value as string)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value as string)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Condition
                </label>
                <div className="flex flex-wrap gap-4">
                  {["Brand New", "Used", "Refurbished"].map((opt) => (
                    <label key={opt} className="group cursor-pointer">
                      <input
                        type="radio"
                        name="condition"
                        value={opt}
                        checked={condition === opt}
                        onChange={() => setCondition(opt as string)}
                        className="sr-only"
                      />
                      <div
                        className={`px-6 py-3 rounded-xl border-2 transition-all duration-200 ${
                          condition === opt
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-300 bg-white/50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                      >
                        {opt}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Delivery Option
                </label>
                <div className="flex flex-wrap gap-4">
                  {["Fast Delivery", "Self Delivery"].map((opt) => (
                    <label key={opt} className="group cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryOption"
                        value={opt}
                        checked={deliveryOption === opt}
                        onChange={() => setDeliveryOption(opt as string)}
                        className="sr-only"
                      />
                      <div
                        className={`px-6 py-3 rounded-xl border-2 transition-all duration-200 ${
                          deliveryOption === opt
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-300 bg-white/50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                      >
                        {opt}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🏷️</span>
              </div>
              Category & Classification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as string)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.key}
                    </option>
                  ))}
                </select>
              </div>

              {category && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Subcategory
                  </label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value as string)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  >
                    <option value="">Select Subcategory</option>
                    {(
                      subcategoriesMap[
                        category as keyof typeof subcategoriesMap
                      ] || []
                    ).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub as string}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {subcategory && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Sub-Subcategory
                  </label>
                  <select
                    value={subsubcategory}
                    onChange={(e) => setSubsubcategory(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  >
                    <option value="">Select Sub-Subcategory</option>
                    {(subSubcategoriesMap[category]?.[subcategory] ?? []).map(
                      (ss) => (
                        <option key={ss} value={ss}>
                          {ss}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Product Specifications */}
          {subsubcategory && (
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-500 animate-fadeIn">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">⚙️</span>
                </div>
                Product Specifications
              </h2>

              {/* Jewelry Flow */}
              {subsubcategory === "Jewelry" &&
              ["Women", "Men"].includes(category) ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Jewelry Type
                    </label>
                    <select
                      value={jewelryType}
                      onChange={(e) => setJewelryType(e.target.value as string)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    >
                      <option value="">Select Type</option>
                      {jewelryTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Materials
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {jewelryMaterials.map((mat) => (
                        <label key={mat} className="group cursor-pointer">
                          <input
                            type="checkbox"
                            value={mat}
                            checked={selectedMaterials.includes(mat)}
                            onChange={() => {
                              setSelectedMaterials((prev) =>
                                prev.includes(mat)
                                  ? prev.filter((x) => x !== mat)
                                  : [...prev, mat]
                              );
                            }}
                            className="sr-only"
                          />
                          <div
                            className={`px-4 py-2 rounded-lg border-2 text-center transition-all duration-200 ${
                              selectedMaterials.includes(mat)
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-300 bg-white/50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                          >
                            {mat}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Brand selector for non-jewelry
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Brand
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  >
                    <option value="">Select Brand</option>
                    {(brandsByCategory[category]?.[subcategory] ?? []).map(
                      (b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              {/* Pant Flow */}
              {(category === "Women" || category === "Men") &&
                ["Pants", "Jeans", "Leggings"].includes(subsubcategory) && (
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Available Sizes
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {(
                        pantSizesByCategory[
                          category as keyof typeof pantSizesByCategory
                        ] || []
                      ).map((sz) => (
                        <label key={sz} className="group cursor-pointer">
                          <input
                            type="checkbox"
                            value={sz}
                            checked={selectedPantSizes.includes(sz)}
                            onChange={() => {
                              setSelectedPantSizes((prev) =>
                                prev.includes(sz)
                                  ? prev.filter((x) => x !== sz)
                                  : [...prev, sz]
                              );
                            }}
                            className="sr-only"
                          />
                          <div
                            className={`px-3 py-2 rounded-lg border-2 text-center transition-all duration-200 ${
                              selectedPantSizes.includes(sz)
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-300 bg-white/50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                          >
                            {sz}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

              {/* Clothing Flow */}
              {(category === "Women" || category === "Men") &&
                subcategory === "Clothing" &&
                subsubcategory !== "Pants" && (
                  <div className="space-y-6 mt-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Clothing Sizes
                      </label>
                      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {clothingSizes.map((sz) => (
                          <label key={sz} className="group cursor-pointer">
                            <input
                              type="checkbox"
                              value={sz}
                              checked={selectedClothingSizes.includes(sz)}
                              onChange={() => {
                                setSelectedClothingSizes((prev) =>
                                  prev.includes(sz)
                                    ? prev.filter((x) => x !== sz)
                                    : [...prev, sz]
                                );
                              }}
                              className="sr-only"
                            />
                            <div
                              className={`px-3 py-2 rounded-lg border-2 text-center transition-all duration-200 ${
                                selectedClothingSizes.includes(sz)
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-slate-300 bg-white/50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                              }`}
                            >
                              {sz}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Fit
                        </label>
                        <select
                          value={selectedClothingFit}
                          onChange={(e) =>
                            setSelectedClothingFit(e.target.value as string)
                          }
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                        >
                          <option value="">Select Fit</option>
                          {clothingFits.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Type
                        </label>
                        <select
                          value={selectedClothingType}
                          onChange={(e) =>
                            setSelectedClothingType(e.target.value as string)
                          }
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                        >
                          <option value="">Select Type</option>
                          {clothingTypes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

              {/* Footwear Flow */}
              {[
                "Footwear",
                "Women's Shoes",
                "Men's Shoes",
                "Kids' Shoes",
                "Sports Shoes",
              ].includes(subsubcategory) && (
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Gender
                    </label>
                    <select
                      value={selectedFootwearGender}
                      onChange={(e) =>
                        setSelectedFootwearGender(e.target.value as string)
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    >
                      <option value="">Select Gender</option>
                      {["Women", "Men", "Kids"].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Footwear Sizes
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {(
                        footwearSizesByCategory[
                          selectedFootwearGender as keyof typeof footwearSizesByCategory
                        ] || []
                      ).map((sz) => (
                        <label key={sz} className="group cursor-pointer">
                          <input
                            type="checkbox"
                            value={sz}
                            checked={selectedFootwearSizes.includes(sz)}
                            onChange={() => {
                              setSelectedFootwearSizes((prev) =>
                                prev.includes(sz)
                                  ? prev.filter((x) => x !== sz)
                                  : [...prev, sz]
                              );
                            }}
                            className="sr-only"
                          />
                          <div
                            className={`px-3 py-2 rounded-lg border-2 text-center transition-all duration-200 ${
                              selectedFootwearSizes.includes(sz)
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-300 bg-white/50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                          >
                            {sz}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Gender + Colors */}
              <div className="space-y-6 mt-8 pt-8 border-t border-slate-200">
                {category === "Bags" && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Target Gender
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {["Women", "Men", "Unisex"].map((g) => (
                        <label key={g} className="group cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value={g}
                            checked={selectedGender === g}
                            onChange={() => setSelectedGender(g as string)}
                            className="sr-only"
                          />
                          <div
                            className={`px-6 py-3 rounded-xl border-2 transition-all duration-200 ${
                              selectedGender === g
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-300 bg-white/50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                          >
                            {g}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Available Colors
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {colorOptions.map((color) => (
                      <div key={color.name} className="group">
                        <label className="cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selectedColors[color.name]}
                            onChange={() => toggleColor(color.name)}
                            className="sr-only"
                          />
                          <div
                            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                              selectedColors[color.name]
                                ? "border-blue-500 bg-blue-50/50"
                                : "border-slate-300 bg-white/50 hover:border-blue-300 hover:bg-blue-50/30"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="font-medium text-slate-700">
                                {color.name}
                              </span>
                            </div>

                            {selectedColors[color.name] && (
                              <div className="space-y-3 animate-fadeIn">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Quantity
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="Enter quantity"
                                    value={selectedColors[color.name].quantity}
                                    onChange={(e) =>
                                      handleColorQuantity(
                                        color.name as string,
                                        e.target.value as string
                                      )
                                    }
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Color Image
                                  </label>
                                  {selectedColors[color.name].image ? (
                                    <div className="space-y-2">
                                      <div className="relative inline-block">
                                        <Image
                                          src={URL.createObjectURL(
                                            selectedColors[color.name].image!
                                          )}
                                          alt={`${color.name} preview`}
                                          width={80}
                                          height={80}
                                          className="w-20 h-20 object-cover rounded-lg border-2 border-slate-200 shadow-sm"
                                          unoptimized={true}
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleColorImage(
                                              color.name as string,
                                              null as unknown as File
                                            )
                                          }
                                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-all duration-200 flex items-center justify-center text-xs z-10"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) =>
                                        handleColorImage(
                                          color.name as string,
                                          e.target.files?.[0] as File
                                        )
                                      }
                                      className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200"
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="text-center pt-8">
            <button
              type="submit"
              className="group relative px-12 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 overflow-hidden"
            >
              <div className="relative bg-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              <span className="relative flex items-center gap-3">
                Continue to Preview
                <svg
                  className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
