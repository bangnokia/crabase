<?php
namespace app\model;

final class Upload extends \support\Model
{
    protected $table = 'uploads';
    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['id', 'user_id', 'name', 'size', 'received', 'mime', 'expires'];
}
