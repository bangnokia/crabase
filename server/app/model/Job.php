<?php

namespace app\model;

use support\Model;

final class Job extends Model
{
    protected $table = 'jobs';
    public $timestamps = false;
    protected $fillable = ['chat_id', 'prompt', 'model', 'effort', 'status', 'turn_id', 'cancel', 'message_id'];

    public static function nextQueued(int $limit): array
    {
        return self::query()->from('jobs as j')->select('j.*', 'c.thread_id', 'p.path')
            ->join('chats as c', 'c.id', '=', 'j.chat_id')->leftJoin('projects as p', 'p.id', '=', 'c.project_id')
            ->where('j.status', 'queued')->where('j.cancel', 0)
            ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('jobs as active')
                ->whereColumn('active.chat_id', 'j.chat_id')->where('active.status', 'running'))
            ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('jobs as earlier')
                ->whereColumn('earlier.chat_id', 'j.chat_id')->where('earlier.status', 'queued')->where('earlier.cancel', 0)->whereColumn('earlier.id', '<', 'j.id'))
            ->orderBy('j.id')->limit($limit)->get()->toArray();
    }

    public function chat(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Chat::class, 'chat_id');
    }
}
