<?php

namespace app\model;

use support\Model;

final class Approval extends Model
{
    protected $table = 'approvals';
    public $timestamps = false;
    protected $fillable = ['chat_id', 'rpc_id', 'method', 'details', 'decision'];

    public function chat(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Chat::class, 'chat_id');
    }
}
