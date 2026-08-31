<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductApiController extends Controller
{
    /**
     * Display a listing of products.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->orderByDesc('updated_at');

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
