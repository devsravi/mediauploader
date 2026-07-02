<?php
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
Use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;


/**
 * @property-read int $id
 * @property string|null $title
 * @property string|null $slug
 * @property string|null $description
 * @property string $file_name
 * @property string|null $original_file_name
 * @property string $file_path
 * @property string|null $file_url
 * @property string $disk
 * @property string|null $collection
 * @property string|null $mime_type
 * @property string|null $extension
 * @property int|null $size
 * @property int|null $width
 * @property int|null $height
 * @property string|null $alt_text
 * @property string|null $caption
 * @property bool $is_active
 * @property bool $is_featured
 * @property int $sort_order
 * @property array|null $metadata
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['title', 'slug', 'description', 'file_name', 'original_file_name', 'file_path', 'file_url', 'disk', 'collection', 'mime_type', 'extension', 'size', 'width', 'height', 'alt_text', 'caption', 'is_active', 'is_featured', 'sort_order', 'metadata', 'created_by', 'updated_by'])]
final class Media extends Model
{
    use SoftDeletes;
  
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'size' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'metadata' => 'array',
        ];
    }

    /**
     * User who created the media.
     * @return BelongsTo<User>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * User who last updated the media.
     * @return BelongsTo<User>
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
