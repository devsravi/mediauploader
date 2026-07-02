<?php

namespace App\Filament\Resources\Media\Schemas;

use Filament\Forms\Components\FileUpload;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class MediaForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Media Details')
                    ->description('Provide details about the media item')
                    ->schema([
                    FileUpload::make('file_path')
                        ->label('Upload Media')
                        ->required()
                        ->disk('public')
                        ->directory('media')
                        ->visibility('public')
                        ->image()
                        ->maxSize(10240)
                        ->acceptedFileTypes(['image/*', 'video/*', 'audio/*', 'application/pdf'])
                        ->imageEditor()
                        ->imageEditorAspectRatioOptions([
                            '16:9',
                            '4:3',
                            '1:1',
                        ])
                        ->downloadable()

                    ])->columnSpan('full'),
            ]);
    }
}
