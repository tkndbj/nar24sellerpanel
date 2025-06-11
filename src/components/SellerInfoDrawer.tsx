import React, { useEffect, useState } from "react";
import { useShop } from "@/context/ShopContext";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getFirestore,
} from "firebase/firestore";
import regionsList from "../constants/regions";
import {
  X,
  Edit2,
  Trash2,
  User,
  MapPin,
  Phone,
  CreditCard,
  Building2,
  Save,
} from "lucide-react";

interface SellerInfo {
  phone: string;
  region: string;
  address: string;
  ibanOwnerName: string;
  ibanOwnerSurname: string;
  iban: string;
}

interface ShopDoc {
  ownerId: string;
  coOwners?: string[];
  editors?: string[];
}

interface SellerInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SellerInfoDrawer: React.FC<SellerInfoDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedShop } = useShop();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const db = getFirestore();
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [shopData, setShopData] = useState<ShopDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SellerInfo>({
    phone: "",
    region: "",
    address: "",
    ibanOwnerName: "",
    ibanOwnerSurname: "",
    iban: "",
  });

  const canEdit = React.useMemo(() => {
    if (!shopData || !userId) return false;
    const { ownerId, coOwners = [], editors = [] } = shopData;
    return (
      ownerId === userId ||
      coOwners.includes(userId) ||
      editors.includes(userId)
    );
  }, [shopData, userId]);

  useEffect(() => {
    if (!selectedShop || !isOpen) return;
    setLoading(true);
    const load = async () => {
      const sellerRef = doc(
        db,
        "shops",
        selectedShop.id,
        "seller_info",
        "info"
      );
      const shopRef = doc(db, "shops", selectedShop.id);
      const [sellerSnap, shopSnap] = await Promise.all([
        getDoc(sellerRef),
        getDoc(shopRef),
      ]);

      if (sellerSnap.exists()) {
        const data = sellerSnap.data() as SellerInfo;
        setSellerInfo(data);
        setForm(data);
      } else {
        setSellerInfo(null);
        setForm({
          phone: "",
          region: "",
          address: "",
          ibanOwnerName: "",
          ibanOwnerSurname: "",
          iban: "",
        });
      }

      if (shopSnap.exists()) {
        setShopData(shopSnap.data() as ShopDoc);
      } else {
        setShopData(null);
      }

      setLoading(false);
    };
    load();
  }, [selectedShop, isOpen, db]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!selectedShop) return;
    setSaving(true);
    try {
      const ref = doc(db, "shops", selectedShop.id, "seller_info", "info");
      await setDoc(ref, form, { merge: true });
      setSellerInfo(form);
      setEditing(false);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedShop) return;
    setSaving(true);
    try {
      const ref = doc(db, "shops", selectedShop.id, "seller_info", "info");
      await deleteDoc(ref);
      setSellerInfo(null);
      setForm({
        phone: "",
        region: "",
        address: "",
        ibanOwnerName: "",
        ibanOwnerSurname: "",
        iban: "",
      });
      setEditing(false);
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Enhanced Backdrop with Blur */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-500 ease-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Modern Drawer - Full width on mobile, 96 on desktop */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-96 bg-gradient-to-br from-white via-gray-50 to-white shadow-2xl z-50 transform transition-all duration-500 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } flex flex-col border-l border-gray-100`}
      >
        {/* Premium Header */}
        <div className="relative bg-indigo-600 text-white">
          <div className="relative flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Seller Information</h2>
                <p className="text-sm text-gray-300">Manage seller details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 font-medium">
                  Loading seller information...
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {sellerInfo && !editing ? (
                /* Display Mode */
                <div className="space-y-6">
                  {canEdit && (
                    <div className="flex justify-end space-x-2 mb-6">
                      <button
                        onClick={() => setEditing(true)}
                        className="group flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        aria-label="Edit"
                      >
                        <Edit2 className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                        <span className="font-medium">Edit</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={saving}
                        className="group flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                        <span className="font-medium">Delete</span>
                      </button>
                    </div>
                  )}

                  {/* Info Cards */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Phone className="w-4 h-4 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-gray-800">
                          Phone Number
                        </h3>
                      </div>
                      <p className="text-gray-700 font-mono text-lg">
                        {sellerInfo.phone}
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <MapPin className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-800">
                          Location
                        </h3>
                      </div>
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">Region:</span>{" "}
                        {sellerInfo.region}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Address:</span>{" "}
                        {sellerInfo.address}
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <CreditCard className="w-4 h-4 text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-gray-800">
                          Banking Information
                        </h3>
                      </div>
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">Account Owner:</span>{" "}
                        {sellerInfo.ibanOwnerName} {sellerInfo.ibanOwnerSurname}
                      </p>
                      <p className="text-gray-700 font-mono">
                        {sellerInfo.iban}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Mode or No Seller Info */
                <div className="space-y-6">
                  {/* Empty State Header - Always show when no seller info */}
                  {!sellerInfo && (
                    <div className="flex flex-col items-center text-center mb-8">
                      <div className="p-4 bg-gray-100 rounded-full mb-4">
                        <div className="w-20 h-20 rounded-lg flex items-center justify-center">
                          <img
                            src="/payment1.png"
                            alt="Payment"
                            className="w-20 h-20 object-contain"
                          />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Satıcı Bilgileri Yok
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Ürün listeleyebilmek için satıcı bilgilerinizi
                        ekleyiniz.
                      </p>
                    </div>
                  )}

                  {/* Form Header - Only show when editing existing info */}
                  {sellerInfo && editing && (
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Edit2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">
                        Edit Information
                      </h3>
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* Phone Input */}
                    <div className="group">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                        <Phone className="w-4 h-4" />
                        <span>Phone Number</span>
                      </label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300 placeholder:text-gray-400 md:placeholder:text-gray-300"
                      />
                    </div>

                    {/* Region Select */}
                    <div className="group">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>Region</span>
                      </label>
                      <select
                        name="region"
                        value={form.region}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                      >
                        <option
                          value=""
                          className="text-gray-400 md:text-gray-300"
                        >
                          Select your region
                        </option>
                        {regionsList.map((r: string) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Address Input */}
                    <div className="group">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                        <Building2 className="w-4 h-4" />
                        <span>Address</span>
                      </label>
                      <input
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Enter full address"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300 placeholder:text-gray-400 md:placeholder:text-gray-300"
                      />
                    </div>

                    {/* IBAN Owner Name */}
                    <div className="group">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                        <User className="w-4 h-4" />
                        <span>Account Owner Name</span>
                      </label>
                      <input
                        name="ibanOwnerName"
                        value={form.ibanOwnerName}
                        onChange={handleChange}
                        placeholder="First name"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300 placeholder:text-gray-400 md:placeholder:text-gray-300"
                      />
                    </div>

                    {/* IBAN Owner Surname */}
                    <div className="group">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                        <User className="w-4 h-4" />
                        <span>Account Owner Surname</span>
                      </label>
                      <input
                        name="ibanOwnerSurname"
                        value={form.ibanOwnerSurname}
                        onChange={handleChange}
                        placeholder="Last name"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300 placeholder:text-gray-400 md:placeholder:text-gray-300"
                      />
                    </div>

                    {/* IBAN Input */}
                    <div className="group">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-2">
                        <CreditCard className="w-4 h-4" />
                        <span>IBAN</span>
                      </label>
                      <input
                        name="iban"
                        value={form.iban}
                        onChange={handleChange}
                        placeholder="TR00 0000 0000 0000 0000 0000 00"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300 font-mono placeholder:text-gray-400 md:placeholder:text-gray-300"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-6 border-t border-gray-100">
                    {sellerInfo && (
                      <button
                        onClick={() => {
                          setEditing(false);
                          setForm(
                            sellerInfo || {
                              phone: "",
                              region: "",
                              address: "",
                              ibanOwnerName: "",
                              ibanOwnerSurname: "",
                              iban: "",
                            }
                          );
                        }}
                        disabled={saving}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium disabled:opacity-50 disabled:transform-none"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{sellerInfo ? "Update" : "Create"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SellerInfoDrawer;
