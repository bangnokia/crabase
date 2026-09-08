<?php

namespace app\model;

use support\Model;

final class User extends Model
{
    protected $table = 'users';
    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id', 'name', 'avatar_url', 'created_at'];

    public function messages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Message::class, 'user_id');
    }
}
