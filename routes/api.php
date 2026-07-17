<?php

use App\Http\Controllers\Api\MediaController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:20,1')->group(function (): void {
    Route::post('/media', [MediaController::class, 'store']);
    Route::post('/media/{media}', [MediaController::class, 'update']);
    Route::delete('/media/{media}', [MediaController::class, 'destroy']);
});
