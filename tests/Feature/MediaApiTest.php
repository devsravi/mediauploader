<?php

use App\Models\Media;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake('public');
});

test('the public media api stores an image and returns its metadata', function () {
    $response = $this->postJson('/api/media', [
        'file' => UploadedFile::fake()->image('profile.jpg', 640, 480),
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.original_file_name', 'profile.jpg')
        ->assertJsonPath('data.mime_type', 'image/jpeg')
        ->assertJsonPath('data.width', 640)
        ->assertJsonPath('data.height', 480)
        ->assertJsonPath('data.file_url', 'http://localhost/storage/'.$response->json('data.file_path'));

    $media = Media::query()->sole();

    Storage::disk('public')->assertExists($media->file_path);
    expect($media->created_by)->toBeNull();
});

test('it accepts the non-image types configured by the filament field', function () {
    $response = $this->postJson('/api/media', [
        'file' => UploadedFile::fake()->createWithContent('document.pdf', '%PDF-1.4 test'),
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.width', null)
        ->assertJsonPath('data.height', null);
});

test('it rejects missing unsupported and oversized files', function () {
    $this->postJson('/api/media')->assertInvalid(['file']);

    $this->postJson('/api/media', [
        'file' => UploadedFile::fake()->create('script.php', 1, 'text/x-php'),
    ])->assertInvalid(['file']);

    $this->postJson('/api/media', [
        'file' => UploadedFile::fake()->create('large.jpg', 12289, 'image/jpeg'),
    ])->assertInvalid(['file']);
});

test('it replaces a media file without leaving the old binary behind', function () {
    $oldPath = UploadedFile::fake()->image('old.jpg')->store('media', 'public');
    $media = Media::query()->create([
        'file_name' => basename($oldPath),
        'original_file_name' => 'old.jpg',
        'file_path' => $oldPath,
        'disk' => 'public',
    ]);

    $response = $this->postJson("/api/media/{$media->id}", [
        'file' => UploadedFile::fake()->image('new.png', 320, 240),
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('data.id', $media->id)
        ->assertJsonPath('data.original_file_name', 'new.png');

    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($media->refresh()->file_path);
});

test('it deletes the stored binary and soft deletes the media row', function () {
    $path = UploadedFile::fake()->image('delete.jpg')->store('media', 'public');
    $media = Media::query()->create([
        'file_name' => basename($path),
        'original_file_name' => 'delete.jpg',
        'file_path' => $path,
        'disk' => 'public',
    ]);

    $this->deleteJson("/api/media/{$media->id}")->assertNoContent();

    Storage::disk('public')->assertMissing($path);
    $this->assertSoftDeleted($media);
});
