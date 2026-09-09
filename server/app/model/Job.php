<?php

namespace app\model;

use support\Model;

final class Job extends Model
{
    protected $table = 'jobs';
    public $timestamps = false;
    protected $fillable = ['chat_id', 'prompt', 'model', 'effort', 'status', 'turn_id', 'cancel', 'message_id'];

    public function chat(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Chat::class, 'chat_id');
    }
}
