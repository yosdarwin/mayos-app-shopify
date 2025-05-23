<?php

use App\Exceptions\ShopifyProductCreatorException;
use App\Http\Controllers\MyProductController;
use App\Lib\AuthRedirection;
use App\Lib\EnsureBilling;
use App\Lib\ProductCreator;
use App\Models\Session;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Shopify\Auth\OAuth;
use Shopify\Auth\Session as AuthSession;
use Shopify\Clients\HttpHeaders;
use Shopify\Clients\Rest;
use Shopify\Context;
use Shopify\Exception\InvalidWebhookException;
use Shopify\Utils;
use Shopify\Webhooks\Registry;
use Shopify\Webhooks\Topics;
use Shopify\Clients\Graphql;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
| If you are adding routes outside of the /api path, remember to also add a
| proxy rule for them in web/frontend/vite.config.js
|
*/

Route::fallback(function (Request $request) {
    if (Context::$IS_EMBEDDED_APP &&  $request->query("embedded", false) === "1") {
        if (env('APP_ENV') === 'production') {
            return file_get_contents(public_path('index.html'));
        } else {
            return file_get_contents(base_path('frontend/index.html'));
        }
    } else {
        return redirect(Utils::getEmbeddedAppUrl($request->query("host", null)) . "/" . $request->path());
    }
})->middleware('shopify.installed');

Route::get('/api/auth', function (Request $request) {
    $shop = Utils::sanitizeShopDomain($request->query('shop'));

    // Delete any previously created OAuth sessions that were not completed (don't have an access token)
    Session::where('shop', $shop)->where('access_token', null)->delete();

    return AuthRedirection::redirect($request);
});

Route::get('/api/auth/callback', function (Request $request) {
    $session = OAuth::callback(
        $request->cookie(),
        $request->query(),
        ['App\Lib\CookieHandler', 'saveShopifyCookie'],
    );

    $host = $request->query('host');
    $shop = Utils::sanitizeShopDomain($request->query('shop'));

    $response = Registry::register('/api/webhooks', Topics::APP_UNINSTALLED, $shop, $session->getAccessToken());
    if ($response->isSuccess()) {
        Log::debug("Registered APP_UNINSTALLED webhook for shop $shop");
    } else {
        Log::error(
            "Failed to register APP_UNINSTALLED webhook for shop $shop with response body: " .
                print_r($response->getBody(), true)
        );
    }

    $redirectUrl = Utils::getEmbeddedAppUrl($host);
    if (Config::get('shopify.billing.required')) {
        list($hasPayment, $confirmationUrl) = EnsureBilling::check($session, Config::get('shopify.billing'));

        if (!$hasPayment) {
            $redirectUrl = $confirmationUrl;
        }
    }

    return redirect($redirectUrl);
});

Route::get('/api/products/count', function (Request $request) {
    /** @var AuthSession */
    $session = $request->get('shopifySession'); // Provided by the shopify.auth middleware, guaranteed to be active

    $client = new Rest($session->getShop(), $session->getAccessToken());
    $result = $client->get('products/count');

    return response($result->getDecodedBody());
})->middleware('shopify.auth');



Route::post('/api/products', function (Request $request) {
    /** @var AuthSession */
    $session = $request->get('shopifySession'); // Provided by the shopify.auth middleware, guaranteed to be active

    $success = $code = $error = null;
    try {
        ProductCreator::call($session, 5);
        $success = true;
        $code = 200;
        $error = null;
    } catch (\Exception $e) {
        $success = false;

        if ($e instanceof ShopifyProductCreatorException) {
            $code = $e->response->getStatusCode();
            $error = $e->response->getDecodedBody();
            if (array_key_exists("errors", $error)) {
                $error = $error["errors"];
            }
        } else {
            $code = 500;
            $error = $e->getMessage();
        }

        Log::error("Failed to create products: $error");
    } finally {
        return response()->json(["success" => $success, "error" => $error], $code);
    }
})->middleware('shopify.auth');

Route::post('/api/webhooks', function (Request $request) {
    try {
        $topic = $request->header(HttpHeaders::X_SHOPIFY_TOPIC, '');

        $response = Registry::process($request->header(), $request->getContent());
        if (!$response->isSuccess()) {
            Log::error("Failed to process '$topic' webhook: {$response->getErrorMessage()}");
            return response()->json(['message' => "Failed to process '$topic' webhook"], 500);
        }
    } catch (InvalidWebhookException $e) {
        Log::error("Got invalid webhook request for topic '$topic': {$e->getMessage()}");
        return response()->json(['message' => "Got invalid webhook request for topic '$topic'"], 401);
    } catch (\Exception $e) {
        Log::error("Got an exception when handling '$topic' webhook: {$e->getMessage()}");
        return response()->json(['message' => "Got an exception when handling '$topic' webhook"], 500);
    }
});

Route::get('/api/get-products', function (Request $request) {
    $session = $request->get('shopifySession');
    $client = new Graphql($session->getShop(), $session->getAccessToken());
    $cursor = $request->query('cursor', null);
    $btnClick = $request->query('btnClick', null);
    $keyword = $request->query('search', null);
    $perPage = (int)$request->query('perPage', 3); // Default to 3 items per page if not specified

    if ($btnClick == 'next' || $btnClick == null) {
        $query = '
            query($cursor: String, $perPage: Int!) {
                products(first: $perPage, after: $cursor, query: "' . $keyword . '") {
                    edges {
                    node {
                        id
                        title
                        handle
                        description
                        variants(first: 5) {
                        edges {
                            node {
                            id
                            price
                            compareAtPrice
                            }
                        }
                        }
                        media(first: 5) {
                        edges {
                            node {
                            ... on MediaImage {
                                id
                                image {
                                url
                                altText
                                }
                            }

                            }
                        }
                        }
                    }

                    }
                    pageInfo {
                    hasPreviousPage
                    hasNextPage
                    startCursor
                    endCursor
                    }
                }
            }
        ';
    }
    if ($btnClick == 'prev') {
        $query = '
            query($cursor: String, $perPage: Int!) {
                products(last: $perPage, before: $cursor, query: "' . $keyword . '") {
                    edges {
                    node {
                        id
                        title
                        handle
                        description
                        variants(first: 5) {
                        edges {
                            node {
                            id
                            price
                            compareAtPrice
                            }
                        }
                        }
                        media(first: 5) {
                        edges {
                            node {
                            ... on MediaImage {
                                id
                                image {
                                url
                                altText
                                }
                            }

                            }
                        }
                        }
                    }

                    }
                    pageInfo {
                    hasPreviousPage
                    hasNextPage
                    startCursor
                    endCursor
                    }
                }
                }
        ';
    }
    $response = $client->query([
        'query' => $query,
        'variables' => [
            'cursor' => $cursor,
            'perPage' => $perPage,
        ],
    ]);
    $data = $response->getDecodedBody();
    return response()->json($data);
})->middleware('shopify.auth');

Route::post('/api/add-product', [MyProductController::class, 'addProduct'])->middleware('shopify.auth');
Route::post('/api/update-product', [MyProductController::class, 'updateProduct'])->middleware('shopify.auth');

// Get store information
Route::get('/api/store-info', function (Request $request) {
    /** @var AuthSession */
    $session = $request->get('shopifySession'); // Provided by the shopify.auth middleware, guaranteed to be active

    $client = new Graphql($session->getShop(), $session->getAccessToken());
    $query = '{
        shop {
            name
            email
            myshopifyDomain
            primaryDomain {
                url
            }
        }
    }';

    $response = $client->query($query);
    $data = $response->getDecodedBody();

    return response()->json($data);
})->middleware('shopify.auth');

// Get existing products from database
Route::get('/api/existing-products', [MyProductController::class, 'getExistingProducts'])->middleware('shopify.auth');

// Delete product from database (using POST for better compatibility)
Route::post('/api/delete-product', [MyProductController::class, 'deleteProduct'])->middleware('shopify.auth');

// Get Desc product - no auth middleware so it can be accessed from the theme
Route::get('/api/proxy/desc-product/{id}', [MyProductController::class, 'getDescProduct'])->middleware('auth.proxy');
