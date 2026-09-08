<?php

namespace app\model;

use support\Model;

final class Project extends Model
{
    protected $table = 'projects';
    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id', 'name', 'path'];

    public function chats(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Chat::class, 'project_id');
    }
}
