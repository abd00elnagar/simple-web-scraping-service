<?php

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('can retrieve full list of products via bare API', function () {
    Product::create([
        'title'      => 'Abominable Hoodie',
        'price'      => 69.00,
        'image_url'  => 'https://www.scrapingcourse.com/ecommerce/wp-content/uploads/2024/03/mh09-blue_main.jpg',
        'source_url' => 'https://www.scrapingcourse.com/ecommerce/product/abominable-hoodie/',
    ]);

    Product::create([
        'title'      => 'Adrienne Trek Jacket',
        'price'      => 57.00,
        'image_url'  => 'https://www.scrapingcourse.com/ecommerce/wp-content/uploads/2024/03/wj08-gray_main.jpg',
        'source_url' => 'https://www.scrapingcourse.com/ecommerce/product/adrienne-trek-jacket/',
    ]);

    $response = $this->getJson('/api/products');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'title', 'price', 'image_url', 'source_url', 'created_at', 'updated_at'],
            ],
            'meta' => [
                'total',
            ],
        ])
        ->assertJsonPath('meta.total', 2)
        ->assertJsonCount(2, 'data');
});

test('can retrieve paginated list of products when requested', function () {
    Product::create([
        'title'      => 'Abominable Hoodie',
        'price'      => 69.00,
        'image_url'  => 'https://www.scrapingcourse.com/ecommerce/wp-content/uploads/2024/03/mh09-blue_main.jpg',
        'source_url' => 'https://www.scrapingcourse.com/ecommerce/product/abominable-hoodie/',
    ]);

    Product::create([
        'title'      => 'Adrienne Trek Jacket',
        'price'      => 57.00,
        'image_url'  => 'https://www.scrapingcourse.com/ecommerce/wp-content/uploads/2024/03/wj08-gray_main.jpg',
        'source_url' => 'https://www.scrapingcourse.com/ecommerce/product/adrienne-trek-jacket/',
    ]);

    $response = $this->getJson('/api/products?page=1&per_page=1');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'title', 'price', 'image_url', 'source_url', 'created_at', 'updated_at'],
            ],
            'meta' => [
                'current_page',
                'from',
                'last_page',
                'per_page',
                'to',
                'total',
            ],
        ])
        ->assertJsonPath('meta.total', 2)
        ->assertJsonCount(1, 'data');
});

test('can retrieve a single product by ID', function () {
    $product = Product::create([
        'title'      => 'Affirm Water Bottle',
        'price'      => 7.00,
        'image_url'  => 'https://example.com/bottle.jpg',
        'source_url' => 'https://example.com/bottle',
    ]);

    $response = $this->getJson("/api/products/{$product->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.id', $product->id)
        ->assertJsonPath('data.title', 'Affirm Water Bottle');
});

test('returns 404 json response when product is not found', function () {
    $response = $this->getJson('/api/products/99999');

    $response->assertStatus(404)
        ->assertJson([
            'message' => 'Product not found',
        ]);
});
