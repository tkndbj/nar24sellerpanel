'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Package, AlertTriangle, Edit3, X, RefreshCw, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';

// Import product data constants
import { categories, subcategoriesMap, subSubcategoriesMap, colorOptions } from '@/constants/productData';

// Types
interface Product {
  id: string;
  productName: string;
  brandModel?: string;
  price?: number;
  currency?: string;
  quantity: number;
  category?: string;
  subcategory?: string;
  subsubcategory?: string;
  imageUrl?: string;
  imageUrls?: string[];
  colorQuantities?: Record<string, number>;
  colorImages?: Record<string, string[]>;
  createdAt?: { seconds: number };
}

// Create color mapping from productData
const colorNameMapping: Record<string, string> = {};
const colorHexMapping: Record<string, string> = {};

colorOptions.forEach(color => {
  const lowerName = color.name.toLowerCase().replace(/\s+/g, '');
  colorNameMapping[lowerName] = color.name;
  colorHexMapping[lowerName] = color.hex;
});

const PAGE_SIZE = 20;

// Main Component
export default function StockPage() {
  const router = useRouter();
  const { selectedShop } = useShop();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<string | null>(null);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [showSubSubcategoryDropdown, setShowSubSubcategoryDropdown] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateProduct, setUpdateProduct] = useState<Product | null>(null);
  const [updateColor, setUpdateColor] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Get available subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    return subcategoriesMap[selectedCategory] || [];
  }, [selectedCategory]);

  // Get available sub-subcategories for selected category and subcategory
  const availableSubSubcategories = useMemo(() => {
    if (!selectedCategory || !selectedSubcategory) return [];
    return subSubcategoriesMap[selectedCategory]?.[selectedSubcategory] || [];
  }, [selectedCategory, selectedSubcategory]);

  // Fetch products from Firebase
  const fetchProducts = useCallback(async (loadMore = false) => {
    if (!selectedShop) return;
    
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setProducts([]);
      setLastDoc(null);
      setImageErrors(new Set());
    }

    try {
      let q = query(
        collection(db, 'shop_products'),
        where('shopId', '==', selectedShop.id),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (loadMore && lastDoc) {
        q = query(
          collection(db, 'shop_products'),
          where('shopId', '==', selectedShop.id),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      const newProducts = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));

      if (loadMore) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }

      setLastDoc(docs[docs.length - 1] || null);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Ürünler yüklenirken hata oluştu:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [selectedShop]);

  // Initial fetch
  useEffect(() => {
    if (selectedShop) {
      fetchProducts();
    }
  }, [selectedShop, fetchProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.productName.toLowerCase().includes(query) ||
        (product.brandModel || '').toLowerCase().includes(query) ||
        (product.category || '').toLowerCase().includes(query) ||
        (product.subcategory || '').toLowerCase().includes(query) ||
        (product.subsubcategory || '').toLowerCase().includes(query)
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

    // Sub-subcategory filter
    if (selectedSubSubcategory) {
      filtered = filtered.filter(product => product.subsubcategory === selectedSubSubcategory);
    }

    // Out of stock filter
    if (showOutOfStock) {
      filtered = filtered.filter(product => {
        if (product.quantity === 0) return true;
        if (product.colorQuantities) {
          return Object.values(product.colorQuantities).some(qty => qty === 0);
        }
        return false;
      });
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedSubcategory, selectedSubSubcategory, showOutOfStock]);

  // Handle category selection
  const handleCategorySelect = (categoryKey: string | null) => {
    setSelectedCategory(categoryKey);
    setSelectedSubcategory(null);
    setSelectedSubSubcategory(null);
    setShowCategoryDropdown(false);
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategoryKey: string | null) => {
    setSelectedSubcategory(subcategoryKey);
    setSelectedSubSubcategory(null);
    setShowSubcategoryDropdown(false);
  };

  // Handle sub-subcategory selection
  const handleSubSubcategorySelect = (subSubcategoryKey: string | null) => {
    setSelectedSubSubcategory(subSubcategoryKey);
    setShowSubSubcategoryDropdown(false);
  };

  // Clear individual filters
  const clearCategoryFilter = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedSubSubcategory(null);
  };

  const clearSubcategoryFilter = () => {
    setSelectedSubcategory(null);
    setSelectedSubSubcategory(null);
  };

  const clearSubSubcategoryFilter = () => {
    setSelectedSubSubcategory(null);
  };

  // Handle quantity update
  const handleUpdateQuantity = async (productId: string, quantity: number, color?: string) => {
    try {
        const updateData: Partial<Product> & { colorQuantities?: Record<string, number> } = {};
      
      if (color) {
        // Find the product to get current colorQuantities
        const product = products.find(p => p.id === productId);
        if (product && product.colorQuantities) {
          updateData.colorQuantities = {
            ...product.colorQuantities,
            [color]: quantity
          };
        }
      } else {
        updateData.quantity = quantity;
      }

      await updateDoc(doc(db, 'shop_products', productId), updateData);

      // Update local state
      setProducts(prev => prev.map(product => {
        if (product.id === productId) {
          if (color && product.colorQuantities) {
            return {
              ...product,
              colorQuantities: {
                ...product.colorQuantities,
                [color]: quantity
              }
            };
          } else {
            return { ...product, quantity };
          }
        }
        return product;
      }));

      setUpdateDialogOpen(false);
      setUpdateProduct(null);
      setUpdateColor(null);
      setNewQuantity('');
    } catch (error) {
      console.error('Miktar güncellenirken hata oluştu:', error);
      alert('Miktar güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Open update dialog
  const openUpdateDialog = (product: Product, color?: string) => {
    setUpdateProduct(product);
    setUpdateColor(color || null);
    const currentQuantity = color && product.colorQuantities 
      ? product.colorQuantities[color] 
      : product.quantity;
    setNewQuantity(currentQuantity.toString());
    setUpdateDialogOpen(true);
  };

  // Get valid image URL
  const getValidImageUrl = (product: Product): string => {
    const urls = [
      product.imageUrl,
      ...(product.imageUrls || []),
      ...Object.values(product.colorImages || {}).flat(),
    ].filter(Boolean);

    return (
      urls.find(
        (url) =>
          url &&
          url.trim().length > 0 &&
          url.startsWith("http") &&
          !imageErrors.has(url)
      ) || ""
    );
  };

  // Handle image load error
  const handleImageError = (url: string) => {
    setImageErrors((prev) => new Set([...prev, url]));
  };

  // Get color style with hex value
  const getColorStyle = (colorKey: string): string => {
    const lowerKey = colorKey.toLowerCase();
    const hexColor = colorHexMapping[lowerKey];
    
    if (hexColor) {
      if (hexColor === '#FFFFFF') {
        return 'border-2 border-gray-300';
      }
      return '';
    }
    
    // Fallback to original color styles if not found
    const colorStyles: Record<string, string> = {
      'blue': 'bg-blue-500',
      'orange': 'bg-orange-500',
      'yellow': 'bg-yellow-400',
      'black': 'bg-black',
      'brown': 'bg-amber-800',
      'gray': 'bg-gray-500',
      'pink': 'bg-pink-500',
      'red': 'bg-red-500',
      'white': 'bg-white border-2 border-gray-300',
      'green': 'bg-green-500',
      'purple': 'bg-purple-500',
      'teal': 'bg-teal-500',
      'lime': 'bg-lime-500',
      'cyan': 'bg-cyan-500',
      'magenta': 'bg-pink-400',
      'indigo': 'bg-indigo-500',
      'amber': 'bg-amber-500'
    };
    
    return colorStyles[lowerKey] || 'bg-gray-400';
  };

  if (!selectedShop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 pt-20 px-4">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium text-center">
            Stok takibi için bir mağaza seçin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pt-20 sm:pt-24">
      <div className="container mx-auto px-0 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 px-3 sm:px-0">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow flex-shrink-0 mt-1 sm:mt-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                Stok Yönetimi
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {selectedShop.name} mağazası için ürün envanterini takip edin ve yönetin
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters Card */}
        <div className="bg-white rounded-none sm:rounded-2xl shadow-lg border-0 sm:border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8 mx-0 sm:mx-0">
          {/* Search Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Ürün adı, marka veya kategori ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500 transition-all text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Applied Filters */}
          {(selectedCategory || selectedSubcategory || selectedSubSubcategory) && (
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-wrap gap-2">
                {selectedCategory && (
                  <div className="flex items-center gap-2 bg-blue-100 text-blue-900 px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium">
                    <span className="truncate max-w-[100px] sm:max-w-none">{selectedCategory}</span>
                    <button
                      onClick={clearCategoryFilter}
                      className="hover:bg-blue-200 rounded-full p-1 transition-colors flex-shrink-0"
                    >
                      <X className="w-2 h-2 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                )}
                {selectedSubcategory && (
                  <div className="flex items-center gap-2 bg-green-100 text-green-900 px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium">
                    <span className="truncate max-w-[100px] sm:max-w-none">{selectedSubcategory}</span>
                    <button
                      onClick={clearSubcategoryFilter}
                      className="hover:bg-green-200 rounded-full p-1 transition-colors flex-shrink-0"
                    >
                      <X className="w-2 h-2 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                )}
                {selectedSubSubcategory && (
                  <div className="flex items-center gap-2 bg-purple-100 text-purple-900 px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium">
                    <span className="truncate max-w-[100px] sm:max-w-none">{selectedSubSubcategory}</span>
                    <button
                      onClick={clearSubSubcategoryFilter}
                      className="hover:bg-purple-200 rounded-full p-1 transition-colors flex-shrink-0"
                    >
                      <X className="w-2 h-2 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filters - Horizontal scroll on mobile */}
          <div className="overflow-x-auto">
            <div className="flex gap-2 sm:gap-3 pb-2 min-w-max sm:min-w-0 sm:flex-wrap">
              {/* Category Filter */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors min-w-[140px] sm:min-w-[160px] text-left"
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium truncate">
                    {selectedCategory || 'Kategori Seç'}
                  </span>
                </button>
                
                {/* Mobile Category Modal/Dropdown */}
                {showCategoryDropdown && (
                  <>
                    {/* Mobile backdrop */}
                    <div 
                      className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden" 
                      onClick={() => setShowCategoryDropdown(false)}
                    />
                    
                    {/* Dropdown/Modal */}
                    <div className={`
                      ${/* Mobile: modal style */ ''}
                      sm:absolute sm:top-full sm:left-0 sm:mt-2 sm:w-64 sm:rounded-xl sm:shadow-xl
                      ${/* Mobile: full screen modal */ ''}
                      fixed sm:relative top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 sm:transform-none
                      w-[90vw] max-w-sm sm:max-w-none h-auto max-h-[70vh] sm:max-h-64
                      bg-white border border-gray-200 z-50 overflow-y-auto
                      rounded-2xl sm:rounded-xl shadow-2xl sm:shadow-xl
                      animate-in slide-in-from-top-2 duration-200
                    `}>
                      {/* Mobile header */}
                      <div className="sm:hidden flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">Kategori Seç</h3>
                        <button
                          onClick={() => setShowCategoryDropdown(false)}
                          className="p-1 hover:bg-gray-100 rounded-full"
                        >
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => handleCategorySelect(null)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm border-b border-gray-100"
                      >
                        Tümü
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.key}
                          onClick={() => handleCategorySelect(category.key)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm"
                        >
                          {category.key}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Subcategory Filter */}
              {selectedCategory && availableSubcategories.length > 0 && (
                <div className="relative animate-in slide-in-from-left duration-300 flex-shrink-0">
                  <button
                    onClick={() => setShowSubcategoryDropdown(!showSubcategoryDropdown)}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors min-w-[140px] sm:min-w-[160px] text-left"
                  >
                    <span className="text-xs sm:text-sm font-medium text-green-800 truncate">
                      {selectedSubcategory || 'Alt Kategori Seç'}
                    </span>
                  </button>
                  
                  {showSubcategoryDropdown && (
                    <>
                      {/* Mobile backdrop */}
                      <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden" 
                        onClick={() => setShowSubcategoryDropdown(false)}
                      />
                      
                      {/* Dropdown/Modal */}
                      <div className={`
                        ${/* Mobile: modal style */ ''}
                        sm:absolute sm:top-full sm:left-0 sm:mt-2 sm:w-64 sm:rounded-xl sm:shadow-xl
                        ${/* Mobile: full screen modal */ ''}
                        fixed sm:relative top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 sm:transform-none
                        w-[90vw] max-w-sm sm:max-w-none h-auto max-h-[70vh] sm:max-h-64
                        bg-white border border-gray-200 z-50 overflow-y-auto
                        rounded-2xl sm:rounded-xl shadow-2xl sm:shadow-xl
                        animate-in slide-in-from-top-2 duration-200
                      `}>
                        {/* Mobile header */}
                        <div className="sm:hidden flex items-center justify-between p-4 border-b border-gray-100">
                          <h3 className="text-lg font-semibold text-gray-900">Alt Kategori Seç</h3>
                          <button
                            onClick={() => setShowSubcategoryDropdown(false)}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <X className="w-5 h-5 text-gray-500" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleSubcategorySelect(null)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm border-b border-gray-100"
                        >
                          Tümü
                        </button>
                        {availableSubcategories.map((subcategory) => (
                          <button
                            key={subcategory}
                            onClick={() => handleSubcategorySelect(subcategory)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm"
                          >
                            {subcategory}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sub-Subcategory Filter */}
              {selectedSubcategory && availableSubSubcategories.length > 0 && (
                <div className="relative animate-in slide-in-from-left duration-300 flex-shrink-0">
                  <button
                    onClick={() => setShowSubSubcategoryDropdown(!showSubSubcategoryDropdown)}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors min-w-[140px] sm:min-w-[160px] text-left"
                  >
                    <span className="text-xs sm:text-sm font-medium text-purple-800 truncate">
                      {selectedSubSubcategory || 'Alt Alt Kategori Seç'}
                    </span>
                  </button>
                  
                  {showSubSubcategoryDropdown && (
                    <>
                      {/* Mobile backdrop */}
                      <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden" 
                        onClick={() => setShowSubSubcategoryDropdown(false)}
                      />
                      
                      {/* Dropdown/Modal */}
                      <div className={`
                        ${/* Mobile: modal style */ ''}
                        sm:absolute sm:top-full sm:left-0 sm:mt-2 sm:w-64 sm:rounded-xl sm:shadow-xl
                        ${/* Mobile: full screen modal */ ''}
                        fixed sm:relative top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 sm:transform-none
                        w-[90vw] max-w-sm sm:max-w-none h-auto max-h-[70vh] sm:max-h-64
                        bg-white border border-gray-200 z-50 overflow-y-auto
                        rounded-2xl sm:rounded-xl shadow-2xl sm:shadow-xl
                        animate-in slide-in-from-top-2 duration-200
                      `}>
                        {/* Mobile header */}
                        <div className="sm:hidden flex items-center justify-between p-4 border-b border-gray-100">
                          <h3 className="text-lg font-semibold text-gray-900">Alt Alt Kategori Seç</h3>
                          <button
                            onClick={() => setShowSubSubcategoryDropdown(false)}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <X className="w-5 h-5 text-gray-500" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleSubSubcategorySelect(null)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm border-b border-gray-100"
                        >
                          Tümü
                        </button>
                        {availableSubSubcategories.map((subSubcategory) => (
                          <button
                            key={subSubcategory}
                            onClick={() => handleSubSubcategorySelect(subSubcategory)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm"
                          >
                            {subSubcategory}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Out of Stock Filter */}
              <button
                onClick={() => setShowOutOfStock(!showOutOfStock)}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 border rounded-xl transition-all flex-shrink-0 min-w-[120px] sm:min-w-auto ${
                  showOutOfStock
                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Tükenenler</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={() => fetchProducts()}
                disabled={isLoading}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-blue-700 flex-shrink-0 min-w-[100px] sm:min-w-auto"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Yenile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Products List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 text-base sm:text-lg font-medium">Ürünler yükleniyor...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0 sm:space-y-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 sm:py-16 px-4">
                <Package className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mx-auto mb-4 sm:mb-6" />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  Ürün bulunamadı
                </h3>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base">
                  Arama kriterlerinizi değiştirmeyi deneyin
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                    setSelectedSubSubcategory(null);
                    setShowOutOfStock(false);
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm sm:text-base"
                >
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              <>
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onUpdateQuantity={openUpdateDialog}
                    getValidImageUrl={getValidImageUrl}
                    handleImageError={handleImageError}
                    getColorStyle={getColorStyle}
                    colorNameMapping={colorNameMapping}
                    colorHexMapping={colorHexMapping}
                  />
                ))}
                
                {/* Load More Button */}
                {hasMore && !showOutOfStock && !searchQuery && !selectedCategory && (
                  <div className="text-center pt-6 sm:pt-8 px-3 sm:px-0">
                    <button
                      onClick={() => fetchProducts(true)}
                      disabled={isLoadingMore}
                      className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 shadow-lg text-sm sm:text-base"
                    >
                      {isLoadingMore ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Yükleniyor...
                        </div>
                      ) : (
                        'Daha Fazla Yükle'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Update Quantity Dialog */}
        {updateDialogOpen && updateProduct && (
          <UpdateQuantityDialog
            product={updateProduct}
            color={updateColor}
            isOpen={updateDialogOpen}
            onClose={() => setUpdateDialogOpen(false)}
            onUpdate={handleUpdateQuantity}
            newQuantity={newQuantity}
            setNewQuantity={setNewQuantity}
            colorNameMapping={colorNameMapping}
          />
        )}
      </div>
    </div>
  );
}

// Product Card Component
interface ProductCardProps {
  product: Product;
  onUpdateQuantity: (product: Product, color?: string) => void;
  getValidImageUrl: (product: Product) => string;
  handleImageError: (url: string) => void;
  getColorStyle: (colorKey: string) => string;
  colorNameMapping: Record<string, string>;
  colorHexMapping: Record<string, string>;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onUpdateQuantity, 
  getValidImageUrl, 
  handleImageError,
  getColorStyle,
  colorNameMapping,
  colorHexMapping
}) => {
  const isOutOfStock = product.quantity === 0;
  const hasColorOptions = product.colorQuantities && Object.keys(product.colorQuantities).length > 0;
  const displayImage = getValidImageUrl(product);

  return (
    <div className={`bg-white rounded-none sm:rounded-2xl shadow-lg border-0 sm:border-2 transition-all hover:shadow-xl mx-0 sm:mx-0 mb-2 sm:mb-0 ${
      isOutOfStock ? 'border-red-400 bg-red-50' : 'sm:border-gray-100 hover:border-blue-200'
    }`}>
      <div className="p-3 sm:p-6">
        <div className="flex flex-row gap-3 sm:gap-6">
          {/* Product Image - Smaller on mobile */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 sm:w-28 sm:h-28 bg-gray-100 rounded-lg sm:rounded-xl overflow-hidden relative">
              {displayImage ? (
                <Image
                  src={displayImage}
                  alt={product.productName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 64px, 112px"
                  onError={() => handleImageError(displayImage)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 sm:w-10 sm:h-10 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Product Details - Compact on mobile */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 sm:mb-3 gap-1 sm:gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base sm:text-xl text-gray-900 mb-0 sm:mb-1 break-words leading-tight">
                  {product.productName}
                </h3>
                {product.brandModel && (
                  <p className="text-gray-600 text-xs sm:text-sm mb-1 sm:mb-2 break-words">
                    {product.brandModel}
                  </p>
                )}
              </div>
              {product.price && (
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-lg sm:text-2xl font-bold text-purple-600">
                    {product.price.toFixed(2)} {product.currency || 'TL'}
                  </p>
                </div>
              )}
            </div>

            {/* Main Quantity - Compact on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-4 mb-2 sm:mb-4 gap-2 sm:gap-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">
                  Toplam Stok:
                </span>
                <span className={`text-sm sm:text-lg font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg ${
                  product.quantity === 0 
                    ? 'bg-red-100 text-red-600' 
                    : product.quantity < 10
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-green-100 text-green-600'
                }`}>
                  {product.quantity}
                </span>
              </div>
              <button
                onClick={() => onUpdateQuantity(product)}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md sm:rounded-lg transition-colors font-medium text-xs sm:text-base"
              >
                <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                Güncelle
              </button>
            </div>

            {/* Color Quantities - More compact on mobile */}
            {hasColorOptions && (
              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-semibold text-gray-800 mb-2 text-xs sm:text-base">Renk Stoğu:</h4>
                <div className="space-y-1 sm:space-y-3">
                  {Object.entries(product.colorQuantities!).map(([color, quantity]) => {
                    const lowerColor = color.toLowerCase();
                    const hexColor = colorHexMapping[lowerColor];
                    const colorName = colorNameMapping[lowerColor] || color;
                    
                    return (
                      <div key={color} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-md sm:rounded-lg p-2 sm:p-3 gap-1 sm:gap-0">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-4 h-4 sm:w-8 sm:h-8 rounded-full border-2 border-gray-300 flex-shrink-0 ${getColorStyle(color)}`}
                            style={hexColor ? { backgroundColor: hexColor } : {}}
                          />
                          <span className="text-xs sm:text-sm font-medium text-gray-700 min-w-0 flex-1">
                            {colorName}:
                          </span>
                          <span className={`text-xs sm:text-sm font-bold px-1 sm:px-2 py-0.5 sm:py-1 rounded flex-shrink-0 ${
                            quantity === 0 
                              ? 'bg-red-100 text-red-600' 
                              : quantity < 5
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {quantity}
                          </span>
                        </div>
                        <button
                          onClick={() => onUpdateQuantity(product, color)}
                          className="flex items-center justify-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md sm:rounded-lg transition-colors flex-shrink-0 self-end sm:self-auto"
                        >
                          <Edit3 className="w-2 h-2 sm:w-3 sm:h-3" />
                          Güncelle
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Update Quantity Dialog Component
interface UpdateQuantityDialogProps {
  product: Product;
  color: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (productId: string, quantity: number, color?: string) => void;
  newQuantity: string;
  setNewQuantity: (value: string) => void;
  colorNameMapping: Record<string, string>;
}

const UpdateQuantityDialog: React.FC<UpdateQuantityDialogProps> = ({
  product,
  color,
  isOpen,
  onClose,
  onUpdate,
  newQuantity,
  setNewQuantity,
  colorNameMapping
}) => {
  const handleUpdate = () => {
    const quantity = parseInt(newQuantity);
    if (!isNaN(quantity) && quantity >= 0) {
      onUpdate(product.id, quantity, color || undefined);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUpdate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl mx-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 pr-4">
            Stok Miktarını Güncelle
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        
        <div className="mb-4 sm:mb-6">
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4">
            <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base break-words">
              {product.productName}
            </p>
            {color && (
              <p className="text-xs sm:text-sm text-gray-600">
                Renk: <span className="font-medium text-blue-600">
                  {colorNameMapping[color.toLowerCase()] || color}
                </span>
              </p>
            )}
          </div>
          
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Yeni Miktar
          </label>
          <input
            type="number"
            placeholder="Stok miktarını girin"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900 text-base sm:text-lg"
            min="0"
            autoFocus
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm sm:text-base"
          >
            İptal
          </button>
          <button
            onClick={handleUpdate}
            className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors font-medium text-sm sm:text-base"
          >
            Güncelle
          </button>
        </div>
      </div>
    </div>
  );
};