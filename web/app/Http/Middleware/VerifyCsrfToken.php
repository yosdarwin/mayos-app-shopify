<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array
     */
    protected $except = [
        'api/products/count',
        'api/products',
        'api/graphql',
        'api/webhooks',
        'api/add-product',
        'api/test-add-product',
        'api/delete-product',
        'api/update-product',
        'api/test-update-product'
    ];
}
