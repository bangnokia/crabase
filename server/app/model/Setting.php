<?php

namespace app\model;

use support\Model;

final class Setting extends Model
{
    protected $table = 'settings';
    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'key';
    protected $fillable = ['key', 'value'];
}
