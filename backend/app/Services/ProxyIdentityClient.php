<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class ProxyIdentityClient
{
    private string $proxyServiceUrl;

    public function __construct()
    {
        $this->proxyServiceUrl = config('services.proxy_service.url', 'http://localhost:9000');
    }

    /**
     * Fetch the next rotated identity from the Go proxy-service.
     * Relies completely on the Go microservice for browser identity headers.
     *
     * @return array{proxy_label: string, headers: array{User-Agent: string, Accept: string, Accept-Language: string, Sec-Fetch-Mode: string}}
     *
     * @throws RuntimeException if the Go proxy-service is offline or returns an error.
     */
    public function getNextIdentity(): array
    {
        try {
            $response = Http::timeout(5)->get("{$this->proxyServiceUrl}/next-identity");

            if ($response->successful()) {
                $data = $response->json();

                if (empty($data['headers']) || empty($data['proxy_label'])) {
                    throw new RuntimeException("Invalid response payload from proxy-service at {$this->proxyServiceUrl}");
                }

                return [
                    'proxy_label' => $data['proxy_label'],
                    'headers'     => [
                        'User-Agent'      => $data['headers']['User-Agent'] ?? '',
                        'Accept'          => $data['headers']['Accept'] ?? '',
                        'Accept-Language' => $data['headers']['Accept-Language'] ?? '',
                        'Sec-Fetch-Mode'  => $data['headers']['Sec-Fetch-Mode'] ?? '',
                    ],
                ];
            }

            throw new RuntimeException("Proxy service at {$this->proxyServiceUrl} returned HTTP {$response->status()}");
        } catch (\Exception $e) {
            throw new RuntimeException(
                "Failed to communicate with Go proxy-service at {$this->proxyServiceUrl}: {$e->getMessage()}. Ensure the Go proxy service is running.",
                $e->getCode(),
                $e
            );
        }
    }
}
