"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const formattedPrice =
    product.price !== null &&
    product.price !== undefined &&
    product.price !== ""
      ? `$${Number(product.price).toFixed(2)}`
      : "N/A";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      {/* Product Image Area */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-50 dark:bg-zinc-800/40">
        {product.image_url && !imageError ? (
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-105"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-zinc-400 dark:text-zinc-600">
            <svg
              className="h-10 w-10 stroke-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="mt-1 text-xs">No image</span>
          </div>
        )}

        {/* Price Badge Overlay */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs backdrop-blur-md dark:bg-emerald-500">
            {formattedPrice}
          </span>
        </div>
      </div>

      {/* Product Content */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h2
            title={product.title}
            className="line-clamp-2 text-sm font-semibold text-zinc-900 transition-colors group-hover:text-emerald-600 dark:text-zinc-100 dark:group-hover:text-emerald-400 sm:text-base"
          >
            {product.title}
          </h2>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
          <span
            suppressHydrationWarning
            className="text-[11px] text-zinc-400 dark:text-zinc-500"
          >
            ID #{product.id}
          </span>

          <a
            href={product.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <span>View Source</span>
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}
