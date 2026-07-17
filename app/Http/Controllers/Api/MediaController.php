<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMediaRequest;
use App\Http\Resources\MediaResource;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class MediaController extends Controller
{
    public function store(StoreMediaRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $path = $this->storeFile($file);

        try {
            $media = Media::query()->create($this->attributesFor($file, $path));
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($path);

            throw $exception;
        }

        return (new MediaResource($media))
            ->response()
            ->setStatusCode(201);
    }

    public function update(StoreMediaRequest $request, Media $media): MediaResource
    {
        $file = $request->file('file');
        $path = $this->storeFile($file);
        $previousPath = $media->file_path;

        try {
            $media->update($this->attributesFor($file, $path));
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($path);

            throw $exception;
        }

        if ($previousPath !== $path) {
            Storage::disk('public')->delete($previousPath);
        }

        return new MediaResource($media->refresh());
    }

    public function destroy(Media $media): JsonResponse
    {
        $path = $media->file_path;

        $media->delete();
        Storage::disk('public')->delete($path);

        return response()->json(status: 204);
    }

    private function storeFile(UploadedFile $file): string
    {
        $path = $file->store('media', 'public');

        if (! is_string($path)) {
            throw new RuntimeException('The uploaded file could not be stored.');
        }

        return $path;
    }

    /**
     * @return array<string, int|string|null>
     */
    private function attributesFor(UploadedFile $file, string $path): array
    {
        [$width, $height] = $this->imageDimensions($file);

        return [
            'file_name' => basename($path),
            'original_file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_url' => Storage::disk('public')->url($path),
            'disk' => 'public',
            'mime_type' => $file->getMimeType(),
            'extension' => $file->guessExtension() ?: $file->getClientOriginalExtension(),
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
        ];
    }

    /**
     * @return array{0: int|null, 1: int|null}
     */
    private function imageDimensions(UploadedFile $file): array
    {
        if (! str_starts_with((string) $file->getMimeType(), 'image/')) {
            return [null, null];
        }

        $dimensions = @getimagesize($file->getRealPath());

        return $dimensions === false
            ? [null, null]
            : [$dimensions[0], $dimensions[1]];
    }
}
