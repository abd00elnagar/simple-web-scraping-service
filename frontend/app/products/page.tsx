"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product, ProductsApiResponse } from "@/types/product";
import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const POLLING_INTERVAL_SECONDS = 30;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    POLLING_INTERVAL_SECONDS
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "newest">("default");

  // Fetch products from Laravel REST API
  const fetchProducts = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status} (${response.statusText})`);
      }

      const json: ProductsApiResponse = await response.json();
      setProducts(json.data || []);
      setTotalCount(json.meta?.total ?? json.data?.length ?? 0);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch products from backend API";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setSecondsRemaining(POLLING_INTERVAL_SECONDS);
    }
  }, []);

  // Initial fetch + 30s interval polling with clean unmount handling
  useEffect(() => {
    fetchProducts();

    // 30s auto-fetch interval
    const fetchInterval = setInterval(() => {
      fetchProducts();
    }, POLLING_INTERVAL_SECONDS * 1000);

    // 1s countdown ticker for the UI badge
    const countdownInterval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 1 ? prev - 1 : POLLING_INTERVAL_SECONDS));
    }, 1000);

    return () => {
      clearInterval(fetchInterval);
      clearInterval(countdownInterval);
    };
  }, [fetchProducts]);

  // Client-side search and sort filtering
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.source_url.toLowerCase().includes(query)
      );
    }

    if (sortBy === "price-asc") {
      result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sortBy === "newest") {
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [products, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar
        totalCount={totalCount}
        isPolling={!error}
        secondsRemaining={secondsRemaining}
        onManualRefresh={() => fetchProducts(true)}
        isRefreshing={isRefreshing}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header & Search / Sort Controls */}
        <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              Scraped Products Catalog
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Live synchronized catalog polled every 30 seconds from the Laravel 12 API.
            </p>
          </div>

          {/* Search & Sort Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-none">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-4 pl-9 text-xs shadow-xs transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
              />
              <svg
                className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-2.5 right-3 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-xl border border-zinc-200 bg-white py-2 pr-8 pl-3 text-xs text-zinc-700 shadow-xs transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="default">Sort: Default (Latest Update)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Created: Newest First</option>
            </select>
          </div>
        </section>

        {/* Error Banner */}
        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => fetchProducts(true)}
          />
        )}

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="my-16 rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No products matching &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          <EmptyState onRefresh={() => fetchProducts(true)} />
        )}
      </main>
    </div>
  );
}
