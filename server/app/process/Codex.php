<?php
namespace app\process;

use app\service\Store as S;
use Workerman\Timer;
use Workerman\Worker;
use Workerman\Connection\TcpConnection;
use Workerman\Protocols\Http\Request;

final class Codex
{
    private mixed $process = null;
    private array $pipes = [], $pending = [], $items = [], $approvals = [];
    private string $input = '', $output = '', $revision = '';
    private int $sequence = 0;
    private bool $ready = false;
    private ?array $job = null;
    private float $started = 0;
    private array $clients = [];
    private ?Worker $worker = null;
    private bool $bootAttempted = false;

    public function onWorkerStart(Worker $worker): void
    {
        $this->worker = $worker;
        S::db();
        S::run("UPDATE jobs SET status='failed' WHERE status='running'");
        S::run("UPDATE chats SET status='idle' WHERE status IN ('running','approval')");
        S::run("UPDATE approvals SET decision='decline' WHERE decision IS NULL");
        $this->status('ready');
        S::run("INSERT INTO settings VALUES ('models','[]') ON CONFLICT(key) DO UPDATE SET value='[]'");
        // ponytail: one agent turn at a time; add per-worktree workers for parallel coding.
        Timer::add(0.05, function () { $this->tick(); $this->publish(); });
    }

    public function onWebSocketConnect(TcpConnection $connection, Request $request): void
    {
        $host = explode(':', $request->host())[0];
        if (!in_array($host, ['localhost','127.0.0.1']) || !in_array($request->header('origin'), ['http://localhost:5173','http://127.0.0.1:5173','http://localhost:8787','http://127.0.0.1:8787'])) {
            $connection->close(); return;
        }
        $connection->onBufferFull = fn() => $connection->close();
        $this->clients[$connection->id] = ['chat_id'=>null,'state'=>null,'thread'=>null];
    }

    private function reply(TcpConnection $connection, array $message): void {
        $connection->send(json_encode($message, JSON_INVALID_UTF8_SUBSTITUTE));
    }
    public function onClose(TcpConnection $connection): void { unset($this->clients[$connection->id]); }
    public function onMessage(TcpConnection $connection, string $data): void
    {
        if (!isset($this->clients[$connection->id])) { $connection->close(); return; }
        $id = null;
        try {
            if (strlen($data) > 100000) throw new \InvalidArgumentException('Request too large.');
            $m = json_decode($data, true, 32, JSON_THROW_ON_ERROR);
            if (!is_array($m) || !is_int($m['id'] ?? null) || !is_string($m['action'] ?? null) || !is_array($m['data'] ?? null)) throw new \InvalidArgumentException('Expected id, action, and data.');
            $id = $m['id'];
            if ($m['action'] === 'models') {
                if (!$this->process) $this->boot();
                elseif ($this->ready) $this->loadModels();
                $result = ['ok'=>true];
            } elseif ($m['action'] === 'sync') {
                $chatId = empty($m['data']['chat_id']) ? null : S::text($m['data']['chat_id'],64);
                $thread = $chatId ? S::thread($chatId) : null;
                $state = S::snapshot();
                $this->clients[$connection->id] = ['chat_id'=>$chatId,'state'=>$state,'thread'=>$thread];
                $result = ['state'=>$state,'thread'=>$thread];
            } else {
                if (!in_array($m['action'], ['project','create','message','archive','cancel','approval'])) throw new \InvalidArgumentException('Unknown action.');
                $result = \app\service\Actions::handle($m['action'],$m['data']);
            }
            $this->reply($connection,['id'=>$id,'result'=>$result]);
            $this->publish();
        } catch (\InvalidArgumentException|\JsonException $e) {
            $this->reply($connection,['id'=>$id,'error'=>$e->getMessage()]);
        } catch (\Throwable $e) {
            error_log((string)$e);
            $this->reply($connection,['id'=>$id,'error'=>'Unable to save changes. Please try again.']);
        }
    }
    // ponytail: compare subscribed history rows; use database cursors if long histories make this slow.
    private function publish(): void
    {
        $revision = S::all("SELECT value FROM settings WHERE key='revision'")[0]['value'] ?? '';
        if ($revision === $this->revision) return;
        $this->revision = $revision;
        $state = S::snapshot(); $threads = [];
        foreach ($this->clients as $id => &$client) {
            if ($client['state'] === null) continue;
            $patch = ['type'=>'patch'];
            foreach ($state as $key=>$value) if ($value !== $client['state'][$key]) $patch['state'][$key] = $value;
            $client['state'] = $state;
            if ($chatId = $client['chat_id']) {
                $thread = $threads[$chatId] ??= S::thread($chatId);
                $old = array_column($client['thread']['messages'], null, 'id');
                foreach ($thread['messages'] as $message) {
                    $before = $old[$message['id']] ?? null;
                    if ($before === $message) continue;
                    if ($before && str_starts_with($message['body'], $before['body'])) {
                        $patch['append'][] = ['id'=>$message['id'],'delta'=>substr($message['body'],strlen($before['body']))];
                    } else $patch['messages'][] = $message;
                }
                if ($thread['approvals'] !== $client['thread']['approvals']) $patch['approvals'] = $thread['approvals'];
                $patch['chat_id'] = $chatId;
                $client['thread'] = $thread;
            }
            if (isset($patch['state']) || isset($patch['messages']) || isset($patch['append']) || isset($patch['approvals'])) {
                if (isset($this->worker->connections[$id])) $this->reply($this->worker->connections[$id],$patch);
            }
        }
        unset($client);
    }

    private function status(string $value): void { S::run("INSERT INTO settings VALUES ('runtime',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [$value]); }
    private function send(array $message): void { $this->output .= json_encode($message, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE) . "\n"; }
    private function rpc(string $method, array $params, callable $callback): void {
        $id = ++$this->sequence;
        $this->pending[$id] = $callback;
        $this->send(['id'=>$id,'method'=>$method,'params'=>(object)$params]);
    }

    private function boot(): void
    {
        $this->bootAttempted = true;
        $this->status('connecting'); $this->started = microtime(true);
        $this->process = proc_open([getenv('CODEX_BIN') ?: 'codex','app-server'], [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']], $this->pipes, dirname(__DIR__,3));
        if (!is_resource($this->process)) throw new \RuntimeException('Could not start Codex. Check CODEX_BIN.');
        foreach ($this->pipes as $pipe) stream_set_blocking($pipe, false);
        $this->rpc('initialize', ['clientInfo'=>['name'=>'crabase','title'=>'Crabase','version'=>'0.1.0']], function ($result) {
            $this->send(['method'=>'initialized']); $this->ready = true; $this->status('connected'); $this->loadModels();
        });
    }

    private function loadModels(?string $cursor = null, array $models = []): void
    {
        $params = ['limit'=>100,'includeHidden'=>false];
        if ($cursor !== null) $params['cursor'] = $cursor;
        $this->rpc('model/list', $params, function ($result) use ($models) {
            $models = array_merge($models, $result['data']);
            if (!empty($result['nextCursor'])) { $this->loadModels($result['nextCursor'],$models); return; }
            S::run("INSERT INTO settings VALUES ('models',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [json_encode($models,JSON_INVALID_UTF8_SUBSTITUTE)]);
        });
    }
    private function tick(): void
    {
        try {
            if (!$this->bootAttempted && $this->clients) $this->boot();
            if (is_resource($this->process)) {
                if (!proc_get_status($this->process)['running']) throw new \RuntimeException('Codex stopped. Check the local Codex installation and login.');
                if (!$this->ready && microtime(true) - $this->started > 30) throw new \RuntimeException('Codex initialization timed out.');
                if ($this->output !== '') {
                    $written = fwrite($this->pipes[0], $this->output);
                    if ($written === false) throw new \RuntimeException('Codex connection was closed.');
                    $this->output = substr($this->output, $written);
                }
                $stderr = stream_get_contents($this->pipes[2]);
                if ($stderr) file_put_contents(dirname(__DIR__,2).'/runtime/logs/codex.log', $stderr, FILE_APPEND);
                $this->input .= stream_get_contents($this->pipes[1]);
                while (($end = strpos($this->input, "\n")) !== false) {
                    $line = substr($this->input,0,$end); $this->input = substr($this->input,$end+1);
                    $message = json_decode($line,true);
                    if (is_array($message)) $this->receive($message);
                }
            }
            foreach ($this->approvals as $id => $rpcId) {
                $decision = S::all('SELECT decision FROM approvals WHERE id=?', [$id])[0]['decision'] ?? null;
                if ($decision) {
                    $this->send(['id'=>$rpcId,'result'=>['decision'=>$decision]]);
                    unset($this->approvals[$id]);
                    if ($this->job) S::run("UPDATE chats SET status='running' WHERE id=?", [$this->job['chat_id']]);
                }
            }
            if ($this->job) {
                $row = S::all('SELECT cancel,turn_id FROM jobs WHERE id=?', [$this->job['id']])[0];
                if ($row['cancel'] && !empty($row['turn_id']) && empty($this->job['interrupting'])) {
                    $this->job['interrupting'] = true;
                    $this->rpc('turn/interrupt', ['threadId'=>$this->job['thread_id'],'turnId'=>$row['turn_id']], fn($r)=>null);
                }
                return;
            }
            S::run("UPDATE jobs SET status='cancelled' WHERE status='queued' AND cancel=1", []);
            S::run("UPDATE chats SET status='idle' WHERE status='queued' AND NOT EXISTS (SELECT 1 FROM jobs WHERE jobs.chat_id=chats.id AND jobs.status='queued')", []);
            $next = S::all("SELECT j.*, c.thread_id, p.path FROM jobs j JOIN chats c ON c.id=j.chat_id LEFT JOIN projects p ON p.id=c.project_id WHERE j.status='queued' ORDER BY j.id LIMIT 1")[0] ?? null;
            if (!$next) return;
            if (!$this->process) { $this->boot(); return; }
            if (!$this->ready) return;
            $this->job = $next; $this->items = [];
            S::run("UPDATE jobs SET status='running' WHERE id=?", [$next['id']]);
            S::run("UPDATE chats SET status='running' WHERE id=?", [$next['chat_id']]);
            if (!$next['path']) {
                $next['path'] = dirname(__DIR__,2).'/runtime/chats/'.$next['chat_id'];
                if (!is_dir($next['path']) && !mkdir($next['path'],0700,true)) throw new \RuntimeException('Could not create chat directory.');
            }
            $params = ['cwd'=>$next['path'],'approvalPolicy'=>'on-request','sandbox'=>'workspace-write'];
            if ($next['thread_id']) $params['threadId'] = $next['thread_id'];
            $this->rpc($next['thread_id'] ? 'thread/resume' : 'thread/start', $params, function ($result) {
                $thread = $result['thread']['id']; $this->job['thread_id'] = $thread;
                S::run('UPDATE chats SET thread_id=? WHERE id=?', [$thread,$this->job['chat_id']]);
                $turnParams = ['threadId'=>$thread,'input'=>[['type'=>'text','text'=>$this->job['prompt']]]];
                if ($this->job['model'] !== null) $turnParams['model'] = $this->job['model'];
                if ($this->job['effort'] !== null) $turnParams['effort'] = $this->job['effort'];
                $this->rpc('turn/start', $turnParams, function ($result) {
                    if ($this->job) S::run('UPDATE jobs SET turn_id=? WHERE id=?', [$result['turn']['id'],$this->job['id']]);
                });
            });
        } catch (\Throwable $e) {
            if ($this->job) $this->finish('failed', $e->getMessage());
            else {
                $queued = S::all("SELECT * FROM jobs WHERE status='queued' ORDER BY id LIMIT 1")[0] ?? null;
                if ($queued) { $this->job = $queued; $this->finish('failed',$e->getMessage()); }
            }
            $this->shutdown(); $this->status('error');
            error_log('Crabase: '.$e->getMessage());
        }
    }

    private function receive(array $m): void
    {
        if (isset($m['id']) && !isset($m['method'])) {
            $callback = $this->pending[$m['id']] ?? null; unset($this->pending[$m['id']]);
            if (isset($m['error'])) throw new \RuntimeException($m['error']['message'] ?? 'Codex request failed.');
            if ($callback) $callback($m['result'] ?? []);
            return;
        }
        if (isset($m['id'], $m['method'])) {
            if ($this->job && in_array($m['method'], ['item/commandExecution/requestApproval','item/fileChange/requestApproval'])) {
                S::run('INSERT INTO approvals (chat_id,rpc_id,method,details) VALUES (?,?,?,?)', [$this->job['chat_id'],json_encode($m['id']),$m['method'],json_encode($m['params'],JSON_INVALID_UTF8_SUBSTITUTE)]);
                $id = (int)S::db()->lastInsertId(); $this->approvals[$id] = $m['id'];
                S::run("UPDATE chats SET status='approval' WHERE id=?", [$this->job['chat_id']]);
            } else $this->send(['id'=>$m['id'],'error'=>['code'=>-32601,'message'=>'This client does not support this interaction yet.']]);
            return;
        }
        if (!$this->job) return;
        $p = $m['params'] ?? [];
        if (isset($p['threadId']) && $p['threadId'] !== ($this->job['thread_id'] ?? null)) return;
        if (($m['method'] ?? '') === 'item/agentMessage/delta') {
            $id = $this->item($p['itemId'], 'assistant', S::agentName(), '');
            S::run('UPDATE messages SET body=body || ? WHERE id=?', [$p['delta'],$id]);
        }
        if (in_array($m['method'] ?? '', ['item/started','item/completed'])) {
            $item = $p['item']; $type = $item['type'];
            if ($type === 'agentMessage' && isset($item['text'])) {
                $id = $this->item($item['id'], 'assistant',S::agentName(),'');
                S::run('UPDATE messages SET body=? WHERE id=?', [$item['text'],$id]);
            }
            if ($type === 'commandExecution') {
                $body = ($item['command'] ?? 'Command') . "\n" . substr($item['aggregatedOutput'] ?? '', -16000);
                $id = $this->item($item['id'], 'tool','Terminal',$body);
                S::run('UPDATE messages SET body=? WHERE id=?', [$body,$id]);
            }
            if ($type === 'fileChange') {
                $body = implode("\n",array_map(fn($c)=>$c['path'] ?? 'File changed', $item['changes'] ?? []));
                $this->item($item['id'],'tool','File changes',$body);
            }
        }
        if (($m['method'] ?? '') === 'turn/completed') {
            $turn = $p['turn'];
            $this->finish($turn['status'], $turn['error']['message'] ?? null);
        }
    }
    private function item(string $key, string $role, string $author, string $body): int {
        if (!isset($this->items[$key])) {
            S::run('INSERT INTO messages (chat_id,role,author,body,created_at) VALUES (?,?,?,?,?)', [$this->job['chat_id'],$role,$author,$body,gmdate('c')]);
            $this->items[$key] = (int)S::db()->lastInsertId();
        }
        return $this->items[$key];
    }
    private function finish(string $status, ?string $error = null): void {
        $chat = $this->job['chat_id'];
        if ($error) $this->item('error-'.microtime(true),'error',S::agentName(),$error);
        S::run('UPDATE jobs SET status=? WHERE id=?', [$status,$this->job['id']]);
        $queued = S::all("SELECT id FROM jobs WHERE chat_id=? AND status='queued'", [$chat]);
        S::run('UPDATE chats SET status=?, updated_at=? WHERE id=?', [$queued ? 'queued' : 'idle',gmdate('c'),$chat]);
        S::run("UPDATE approvals SET decision='decline' WHERE chat_id=? AND decision IS NULL", [$chat]);
        S::event($chat, S::agentName().' turn '.$status);
        $this->job = null; $this->items = []; $this->approvals = [];
    }
    private function shutdown(): void {
        foreach ($this->pipes as $pipe) if (is_resource($pipe)) fclose($pipe);
        if (is_resource($this->process)) { proc_terminate($this->process); proc_close($this->process); }
        $this->process = null; $this->pipes = []; $this->pending = []; $this->ready = false; $this->output = ''; $this->input = '';
    }
    public function onWorkerStop(): void {
        if ($this->job) $this->finish('interrupted', 'The workspace server stopped. Send a new message to resume.');
        $this->shutdown(); $this->status('offline');
    }
}
