<?php

namespace app\model;

use support\Model;

final class Event extends Model
{
    protected $table = 'events';
    public $timestamps = false;
    protected $fillable = ['chat_id', 'label', 'created_at'];

    public function chat(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Chat::class, 'chat_id');
    }
}
