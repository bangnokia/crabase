<?php

namespace app\model;

use support\Model;

final class Project extends Model
{
    protected $table = 'projects';
    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id', 'name', 'path', 'archived', 'parent_id', 'visibility'];

    public function members(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members', 'project_id', 'user_id');
    }

    public function workspacePath(): string
    {
        if (!$this->parent_id) return \app\service\WorkspaceFolders::resolve($this->path);
        $base = \app\service\WorkspaceFolders::root().'/.worktrees';
        $expected = $this->path;
        $parent = self::query()->find($this->parent_id);
        $directory = $parent ? $base.'/'.\app\service\Worktrees::projectFolder($parent->name) : '';
        $legacy = $base.'/'.$this->parent_id.'/'.$this->id;
        if ($expected !== $legacy && (!$parent || dirname($expected) !== $directory || !preg_match('/^[a-z]+-[a-z]+$/D', basename($expected)))) {
            throw new \InvalidArgumentException('Invalid worktree folder.');
        }
        foreach ([dirname(dirname($expected)), dirname($expected), $expected] as $path) {
            if (is_link($path)) throw new \InvalidArgumentException('Worktree folder cannot be a symlink.');
        }
        if ($this->path !== $expected || realpath($expected) !== $expected || !is_dir($expected) || !is_readable($expected)) {
            throw new \InvalidArgumentException('Worktree folder is unavailable.');
        }
        return $expected;
    }

    public function chats(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Chat::class, 'project_id');
    }
}
