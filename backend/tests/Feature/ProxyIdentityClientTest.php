<?php

use App\Services\ProxyIdentityClient;
use Illuminate\Support\Facades\Http;

test('getNextIdentity returns identity headers directly from Go proxy service', function () {
    Http::fake([
        'http://localhost:9000/next-identity' => Http::response([
            'proxy_label' => 'proxy-3',
            'headers' => [
                'User-Agent'      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
                'Accept'          => 'text/html,application/xhtml+xml',
                'Accept-Language' => 'en-US,en;q=0.9',
                'Sec-Fetch-Mode'  => 'navigate',
            ],
        ], 200),
    ]);

    $client = new ProxyIdentityClient();
    $identity = $client->getNextIdentity();

    expect($identity['proxy_label'])->toBe('proxy-3')
        ->and($identity['headers']['User-Agent'])->toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0')
        ->and($identity['headers']['Sec-Fetch-Mode'])->toBe('navigate');
});

test('getNextIdentity throws RuntimeException when proxy service is unreachable', function () {
    Http::fake([
        'http://localhost:9000/next-identity' => Http::response(null, 500),
    ]);

    $client = new ProxyIdentityClient();

    expect(fn () => $client->getNextIdentity())
        ->toThrow(RuntimeException::class);
});
