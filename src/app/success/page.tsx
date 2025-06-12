"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-1 flex flex-col items-center px-6 pt-16">
        {/* Başarı Animasyonu */}
        <Image
          src="/success.gif"
          alt="Başarılı"
          width={300}
          height={300}
          className="object-contain"
        />

        <div className="mt-8 text-center">
          {/* Başlık */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Tebrikler!
          </h1>
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            Ürününüz onay için gönderildi.
          </p>
        </div>

        <div className="mt-12 w-full max-w-xs">
          {/* Pazara Git Butonu */}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg text-lg font-semibold transition"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>

      {/* Alt boşluk */}
      <div className="h-16" />
    </div>
  );
}
