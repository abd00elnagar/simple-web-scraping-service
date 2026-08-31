<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'title',
        'price',
        'image_url',
        'source_url',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];
}
