<?php

namespace app\model;

use support\Model;

final class Message extends Model
{
    protected $table = 'messages';
    public $timestamps = false;
    protected $fillable = ['chat_id', 'role', 'author', 'body', 'created_at', 'user_id', 'attachments'];
    protected $casts = ['attachments' => 'array'];

    public static function appendBody(int $id, string $delta): void
    {
        // Keep streaming atomic: a read/modify/save cycle can lose concurrent deltas.
        \app\service\Store::notify(\support\Db::update('UPDATE messages SET body=body || ? WHERE id=?', [$delta, $id]));
    }

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function chat(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Chat::class, 'chat_id');
    }
}
