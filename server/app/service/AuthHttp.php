<?php
namespace app\service;

final class AuthHttp
{
    public static function handle(\support\Request $request, string $action): \support\Response
    {
        $headers = ['Cache-Control'=>'no-store','X-Content-Type-Options'=>'nosniff'];
        if (!in_array(explode(':',$request->host())[0], ['localhost','127.0.0.1'],true) || $request->header('sec-fetch-site') === 'cross-site' ||
            ($request->method() !== 'GET' && !Auth::allowedOrigin($request->header('origin')))) return json(['error'=>'Forbidden'])->withStatus(403)->withHeaders($headers);
        try {
            $token = $request->cookie(Auth::COOKIE);
            if ($action === 'login') {
                if (strlen($request->rawBody()) > 4096) throw new \InvalidArgumentException('Request too large.');
                $data = json_decode($request->rawBody(), true);
                if (!is_array($data)) throw new \InvalidArgumentException('Invalid request.');
                $next = Auth::login($data, $request->getRemoteIp());
                Auth::logout($token);
                return json(['user'=>Auth::user($next)])->withHeaders($headers)->cookie(Auth::COOKIE,$next,604800,'/','',false,true,'Strict');
            }
            if ($action === 'logout') {
                Auth::logout($token);
                return json(['ok'=>true])->withHeaders($headers)->cookie(Auth::COOKIE,'',-1,'/','',false,true,'Strict');
            }
            $user = Auth::user($token);
            return json(['user'=>$user])->withStatus($user ? 200 : 401)->withHeaders($headers);
        } catch (\InvalidArgumentException $error) {
            return json(['error'=>$error->getMessage()])->withStatus(400)->withHeaders($headers);
        }
    }
}
