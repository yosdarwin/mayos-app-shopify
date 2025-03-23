<?php

namespace App\Http\Controllers;

use App\Services\ShopifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    protected $shopifyService;
    
    public function __construct(ShopifyService $shopifyService)
    {
        $this->shopifyService = $shopifyService;
    }
    
    public function getProducts(Request $request)
    {
        try {
            // Validate request
            $request->validate([
                'shop' => 'required|string',
                'token' => 'required|string',
                'cursor' => 'nullable|string',
                'limit' => 'nullable|integer|min:1|max:50',
            ]);
            
            // Get session from token
            $session = $this->shopifyService->getSessionFromToken(
                $request->input('shop'),
                $request->input('token')
            );
            
            // Fetch products with optional cursor and limit
            $products = $this->shopifyService->fetchProducts(
                $session,
                $request->input('cursor'),
                $request->input('limit', 10)
            );
            
            return response()->json(json_decode($products));
        } catch (\Exception $e) {
            Log::error('Product fetch error: ' . $e->getMessage());
            return response()->json([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}