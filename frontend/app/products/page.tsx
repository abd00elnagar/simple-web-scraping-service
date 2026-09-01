"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import type { Product, ProductsApiResponse } from "@/types/product";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const POLLING_INTERVAL_SECONDS = 30;
const SEARCH_DEBOUNCE_MS = 400;

type SortOption = "default" | "price-asc" | "price-desc" | "newest";

/** Maps frontend sort values to the backend query parameters */
function buildApiParams(search: string, sort: SortOption): URLSearchParams {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set("search", search.trim());
  }
  if (sort === "price-asc") params.set("sort_price", "asc");
  else if (sort === "price-desc") params.set("sort_price", "desc");
  else if (sort === "newest") params.set("sort_date", "desc");
  // "default" sends no sort params → backend returns randomized order
  return params;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    POLLING_INTERVAL_SECONDS,
  );

  // --- Filter state (drives the API call) ---
  const [searchInput, setSearchInput] = useState<string>(""); // raw input value
  const [activeSearch, setActiveSearch] = useState<string>(""); // debounced, sent to API
  const [sortBy, setSortBy] = useState<SortOption>("default");

  // --- Pagination (client-side slice of the API response) ---
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(30);

  // Debounce search input → only sends to API once user stops typing
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setActiveSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  // Fetch products from Laravel API — search & sort are sent as query params
  const fetchProducts = useCallback(
    async (isManual = false, search = activeSearch, sort = sortBy) => {
      if (isManual) setIsRefreshing(true);
      setError(null);

      const params = buildApiParams(search, sort);
      const qs = params.toString();
      const url = `${API_BASE_URL}/products${qs ? `?${qs}` : ""}`;

      try {
        const response = await fetch(url, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(
            `API returned HTTP ${response.status} (${response.statusText})`,
          );
        }

        const json: ProductsApiResponse = await response.json();
        setProducts(json.data || []);
        setTotalCount(json.meta?.total ?? json.data?.length ?? 0);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch products from backend API";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setSecondsRemaining(POLLING_INTERVAL_SECONDS);
      }
    },
    [activeSearch, sortBy],
  );

  // Re-fetch when search or sort changes (debounced search already accounted for)
  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(false, activeSearch, sortBy);
  }, [activeSearch, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch + 30s auto-polling (re-fetches with current search/sort)
  useEffect(() => {
    fetchProducts();

    const fetchInterval = setInterval(() => {
      fetchProducts();
    }, POLLING_INTERVAL_SECONDS * 1000);

    const countdownInterval = setInterval(() => {
      setSecondsRemaining((prev) =>
        prev > 1 ? prev - 1 : POLLING_INTERVAL_SECONDS,
      );
    }, 1000);

    return () => {
      clearInterval(fetchInterval);
      clearInterval(countdownInterval);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fetchProducts]);

  // Reset to page 1 when items-per-page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Client-side pagination slice (products already filtered/sorted by API)
  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (validCurrentPage - 1) * itemsPerPage;
    return products.slice(start, start + itemsPerPage);
  }, [products, validCurrentPage, itemsPerPage]);

  const startIndex =
    totalItems === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(validCurrentPage * itemsPerPage, totalItems);

  // Page number pills with ellipsis
  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (validCurrentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (validCurrentPage >= totalPages - 3) {
      pages.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      pages.push(
        1,
        "...",
        validCurrentPage - 1,
        validCurrentPage,
        validCurrentPage + 1,
        "...",
        totalPages,
      );
    }

    return pages.map((page, idx) => {
      if (page === "...") {
        return (
          <span
            key={`ellipsis-${idx}`}
            className="px-2 py-1 text-xs text-zinc-400 dark:text-zinc-600"
          >
            ...
          </span>
        );
      }
      const pageNum = page as number;
      const isActive = pageNum === validCurrentPage;
      return (
        <button
          key={`page-${pageNum}`}
          type="button"
          onClick={() => setCurrentPage(pageNum)}
          className={`h-8 min-w-8 rounded-lg px-2.5 text-xs font-semibold transition-all ${
            isActive
              ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {pageNum}
        </button>
      );
    });
  };

  const PaginationBar = ({ scrollToTop = false }) => (
    <div className="flex items-center gap-1.5 self-center sm:self-auto">
      <button
        type="button"
        onClick={() => {
          setCurrentPage((p) => Math.max(1, p - 1));
          if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        disabled={validCurrentPage === 1}
        className="flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ‹ Prev
      </button>
      <div className="flex items-center gap-1">{renderPageNumbers()}</div>
      <button
        type="button"
        onClick={() => {
          setCurrentPage((p) => Math.min(totalPages, p + 1));
          if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        disabled={validCurrentPage === totalPages}
        className="flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Next ›
      </button>
    </div>
  );

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
        {/* Page Header & Controls */}
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              Scraped Products
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Live catalog synced from backend service
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search — debounced, sends ?search= to API */}
            <div className="relative min-w-[200px] flex-1 sm:w-60 sm:flex-none">
              <input
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-4 pl-9 text-xs shadow-xs transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700"
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
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setActiveSearch("");
                  }}
                  className="absolute top-2.5 right-3 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort — sends ?sort_price= or ?sort_date= to API */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-zinc-200 bg-white py-2 pr-8 pl-3 text-xs text-zinc-700 shadow-xs transition-colors focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-zinc-700"
            >
              <option value="default">Sort: Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Created: Newest</option>
            </select>

            {/* Items per page — client-side slice */}
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="rounded-xl border border-zinc-200 bg-white py-2 pr-8 pl-3 text-xs text-zinc-700 shadow-xs transition-colors focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-zinc-700"
            >
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={30}>30 / page</option>
              <option value={60}>60 / page</option>
            </select>
          </div>
        </section>

        {/* TOP PAGINATION BAR */}
        {!isLoading && totalItems > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Showing{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {startIndex}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {totalItems}
              </span>{" "}
              products
              {totalPages > 1 && (
                <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                  (Page {validCurrentPage} of {totalPages})
                </span>
              )}
            </div>
            {totalPages > 1 && <PaginationBar scrollToTop={false} />}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <ErrorBanner message={error} onRetry={() => fetchProducts(true)} />
        )}

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : paginatedProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {paginatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : activeSearch ? (
          <div className="my-16 rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No products matching &ldquo;{activeSearch}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setActiveSearch("");
              }}
              className="mt-3 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Clear search
            </button>
          </div>
        ) : (
          <EmptyState onRefresh={() => fetchProducts(true)} />
        )}

        {/* BOTTOM PAGINATION BAR */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <PaginationBar scrollToTop />
          </div>
        )}
      </main>
    </div>
  );
}
