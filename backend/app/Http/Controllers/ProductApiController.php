<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\ScraperService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProductApiController extends Controller
{
    /**
     * Display a listing of products.
     * Automatically triggers an initial scrape if the database is currently empty.
     */
    public function index(Request $request, ScraperService $scraper): JsonResponse
    {
        // Auto-scrape on initial hit if database has zero records
        if (Product::count() === 0) {
            try {
                Log::info('[ProductApiController] Zero products in DB on initial request. Triggering initial scrape.');
                $scraper->scrape();
            } catch (\Throwable $e) {
                Log::warning('[ProductApiController] Initial auto-scrape failed: ' . $e->getMessage());
            }
        }

        $query = Product::query()->inRandomOrder();

        // will be enabled later with the frontend implementation:
        /*
        if ($request->has('search')) {
            $search = $request->search;
            $query->where('title', 'like', "%{$search}%")
                ->orWhere('source_url', 'like', "%{$search}%");
        }

        if ($request->has('sort_price')) {
            $direction = $request->sort_price === 'desc' ? 'desc' : 'asc';
            $query->orderBy('price', $direction);
        }

        if ($request->has('sort_date')) {
            $direction = $request->sort_date === 'asc' ? 'asc' : 'desc';
            $query->orderBy('created_at', $direction);
        }
        */

        $perPage = (int) $request->input('per_page', 20);
        $products = $query->paginate($perPage);

        return response()->json([
            'data' => $products->items(),
            'meta' => [
                'current_page' => $products->currentPage(),
                'from'         => $products->firstItem(),
                'last_page'    => $products->lastPage(),
                'per_page'     => $products->perPage(),
                'to'           => $products->lastItem(),
                'total'        => $products->total(),
            ],
        ]);
    }

    /**
     * Display the specified product with graceful 404 handling.
     */
    public function show(string|int $id): JsonResponse
    {
        $product = Product::find($id);

        if (! $product) {
            return response()->json([
                'message' => 'Product not found',
            ], 404);
        }

        return response()->json([
            'data' => $product,
        ]);
    }
}
