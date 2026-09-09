<?php
namespace app\service;

use InvalidArgumentException;

final class OAuth
{
    private const PROVIDER = 'https://passport.tdagroup.online';
    private const COOKIE = 'crabase_oauth';

    public static function configured(): bool
    {
        require dirname(__DIR__,2).'/config/crabase.php';
        return (bool)(getenv('CRABASE_OAUTH_CLIENT_ID') && getenv('CRABASE_OAUTH_CLIENT_SECRET'));
    }
    private static function redirectUri(): string
    {
        return 'http://127.0.0.1:8787/auth/oauth/callback';
    }
    public static function start(\support\Request $request): \support\Response
    {
        if (!self::configured()) return response('OAuth login is not configured.',503);
        // Always start on the callback host so the browser-bound cookie is available there.
        if ($request->host() !== '127.0.0.1:8787') return redirect('http://127.0.0.1:8787/auth/oauth/start');
        $state = bin2hex(random_bytes(32));
        $browser = bin2hex(random_bytes(32));
        $verifier = bin2hex(random_bytes(32));
        Store::run('DELETE FROM oauth_flows WHERE expires<?',[time()],false);
        Store::run('INSERT INTO oauth_flows VALUES (?,?,?,?)',[hash('sha256',$state),hash('sha256',$browser),$verifier,time()+600],false);
        $url = self::PROVIDER.'/oauth/authorize?'.http_build_query([
            'client_id'=>getenv('CRABASE_OAUTH_CLIENT_ID'), 'redirect_uri'=>self::redirectUri(),
            'response_type'=>'code', 'state'=>$state,
            'code_challenge'=>rtrim(strtr(base64_encode(hash('sha256',$verifier,true)),'+/','-_'),'='),
            'code_challenge_method'=>'S256',
        ]);
        return redirect($url)->withHeaders(['Cache-Control'=>'no-store','Referrer-Policy'=>'no-referrer'])
            ->cookie(self::COOKIE,$browser,600,'/auth/oauth','',false,true,'Lax');
    }
    public static function consume(string $state, string $browser): string
    {
        if (!preg_match('/^[a-f0-9]{64}$/D',$state) || !preg_match('/^[a-f0-9]{64}$/D',$browser)) throw new InvalidArgumentException('Invalid OAuth session. Please try again.');
        $key = hash('sha256',$state);
        $statement = Store::db()->prepare('DELETE FROM oauth_flows WHERE state_hash=? AND browser_hash=? AND expires>? RETURNING verifier');
        $statement->execute([$key,hash('sha256',$browser),time()]);
        $verifier = $statement->fetchColumn();
        if (!$verifier) throw new InvalidArgumentException('OAuth session expired or was already used. Please try again.');
        return $verifier;
    }
    private static function fetch(string $url, ?array $form = null, ?string $token = null): array
    {
        $curl = curl_init($url);
        $body = '';
        curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>false,CURLOPT_FOLLOWLOCATION=>false,
            CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>15,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
            CURLOPT_HTTPHEADER=>array_filter(['Accept: application/json', $token ? 'Authorization: Bearer '.$token : null]),
            CURLOPT_WRITEFUNCTION=>static function ($handle,$chunk) use (&$body) {
                if (strlen($body)+strlen($chunk)>1000000) return 0;
                $body .= $chunk; return strlen($chunk);
            }]);
        if ($form !== null) curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>http_build_query($form)]);
        $ok = curl_exec($curl);
        $status = curl_getinfo($curl,CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if ($ok === false || $status < 200 || $status >= 300) throw new InvalidArgumentException('OAuth provider request failed. Please try again.');
        $result = json_decode($body,true);
        if (!is_array($result)) throw new InvalidArgumentException('Invalid response from OAuth provider.');
        return $result;
    }
    public static function account(array $profile): string
    {
        $subject = $profile['id'] ?? null;
        if ((!is_string($subject) && !is_int($subject)) || (string)$subject === '' || strlen((string)$subject)>200) throw new InvalidArgumentException('OAuth provider did not return a valid user ID.');
        $subject = (string)$subject;
        $linked = Store::all('SELECT a.user_id,a.enabled FROM oauth_identities o JOIN accounts a ON a.user_id=o.user_id WHERE o.provider=? AND o.subject=?',[self::PROVIDER,$subject])[0] ?? null;
        if ($linked) {
            if (!$linked['enabled']) throw new InvalidArgumentException('Your account is disabled. Contact your administrator.');
            return $linked['user_id'];
        }
        $email = $profile['email'] ?? null;
        $verified = ($profile['email_verified'] ?? null) === true ||
            (is_string($profile['email_verified_at'] ?? null) && strtotime($profile['email_verified_at']) !== false);
        if (!$verified || !is_string($email) || !filter_var($email,FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('A verified email is required to link your account. Use password login or contact your administrator.');
        return \support\Db::transaction(function () use ($email,$subject) {
            $account = Store::all('SELECT user_id FROM accounts WHERE email=? AND enabled=1',[strtolower(trim($email))])[0] ?? null;
            if (!$account) throw new InvalidArgumentException('No enabled Crabase account matches your email. Ask your administrator to create one.');
            if (Store::all('SELECT 1 FROM oauth_identities WHERE provider=? AND user_id=?',[self::PROVIDER,$account['user_id']])) throw new InvalidArgumentException('This account is already linked to another provider identity.');
            Store::run('INSERT INTO oauth_identities VALUES (?,?,?)',[self::PROVIDER,$subject,$account['user_id']],false);
            return $account['user_id'];
        });
    }
    public static function callback(\support\Request $request): \support\Response
    {
        $headers = ['Cache-Control'=>'no-store','Referrer-Policy'=>'no-referrer','X-Content-Type-Options'=>'nosniff'];
        try {
            if (!self::configured() || $request->host() !== '127.0.0.1:8787') throw new InvalidArgumentException('Invalid callback configuration.');
            $state = $request->get('state');
            if (!is_string($state)) throw new InvalidArgumentException('Missing OAuth state.');
            $verifier = self::consume($state,$request->cookie(self::COOKIE) ?? '');
            if ($request->get('error')) throw new InvalidArgumentException('OAuth sign-in was cancelled or denied.');
            $code = $request->get('code');
            if (!is_string($code) || $code === '' || strlen($code)>4096) throw new InvalidArgumentException('Missing authorization code.');
            $result = self::fetch(self::PROVIDER.'/oauth/token',[
                'grant_type'=>'authorization_code','client_id'=>getenv('CRABASE_OAUTH_CLIENT_ID'),
                'client_secret'=>getenv('CRABASE_OAUTH_CLIENT_SECRET'),'redirect_uri'=>self::redirectUri(),
                'code'=>$code,'code_verifier'=>$verifier,
            ]);
            $accessToken = $result['access_token'] ?? null;
            if (!is_string($accessToken) || $accessToken === '' || strlen($accessToken)>16000 || preg_match('/[\x00-\x20\x7f]/',$accessToken)) throw new InvalidArgumentException('Invalid OAuth token response.');
            $id = self::account(self::fetch(self::PROVIDER.'/api/user',null,$accessToken));
            $session = Auth::session($id);
            Auth::logout($request->cookie(Auth::COOKIE));
            return redirect('/')->withHeaders($headers)
                ->cookie(self::COOKIE,'',-1,'/auth/oauth','',false,true,'Lax')
                ->cookie(Auth::COOKIE,$session,604800,'/','',false,true,'Strict');
        } catch (InvalidArgumentException $error) {
            return response(htmlspecialchars($error->getMessage(),ENT_QUOTES,'UTF-8').' <a href="/">Return to sign in</a>',400,$headers)
                ->cookie(self::COOKIE,'',-1,'/auth/oauth','',false,true,'Lax');
        } catch (\Throwable $error) {
            // Do not log provider codes, tokens, request bodies or client secrets.
            return response('Unable to complete sign-in. <a href="/">Try again</a>',503,$headers)
                ->cookie(self::COOKIE,'',-1,'/auth/oauth','',false,true,'Lax');
        }
    }
}
