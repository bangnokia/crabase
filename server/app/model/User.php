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

    public function pinnedProjects(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_pins', 'user_id', 'project_id');
    }

    public function messages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Message::class, 'user_id');
    }
}
