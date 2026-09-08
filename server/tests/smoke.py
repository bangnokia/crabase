#!/usr/bin/env python3
"""Real WebSocket commands, two subscribers, simulated Codex delta, reconnect. No model calls."""
import base64, json, os, socket, struct, subprocess, uuid, tempfile
from pathlib import Path

class Client:
    def __init__(self, origin='http://127.0.0.1:8787'):
        self.socket = socket.create_connection(('127.0.0.1',8788),timeout=5)
        self.sequence, self.buffer, self.events = 0, b'', []
        key = base64.b64encode(os.urandom(16)).decode()
        self.socket.sendall(f'GET / HTTP/1.1\r\nHost: 127.0.0.1:8788\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: {key}\r\nOrigin: {origin}\r\n\r\n'.encode())
        while b'\r\n\r\n' not in self.buffer:
            chunk = self.socket.recv(4096)
            if not chunk: raise ConnectionError('Handshake rejected')
            self.buffer += chunk
        header,self.buffer = self.buffer.split(b'\r\n\r\n',1)
        assert header.split(b' ')[1] == b'101',header
    def read(self,count):
        while len(self.buffer)<count:
            chunk = self.socket.recv(4096)
            if not chunk: raise ConnectionError('Socket closed')
            self.buffer += chunk
        result,self.buffer = self.buffer[:count],self.buffer[count:]
        return result
    def send(self,message):
        data=json.dumps(message).encode(); size=len(data); mask=os.urandom(4)
        header=bytes([0x81,0x80|size]) if size<126 else bytes([0x81,0xfe])+struct.pack('!H',size)
        self.socket.sendall(header+mask+bytes(v^mask[i%4] for i,v in enumerate(data)))
    def receive(self):
        first,size=self.read(2)
        if first&15 == 8: raise ConnectionError('Socket closed')
        assert first&15 == 1 and first&128
        size &= 127
        if size==126: size=struct.unpack('!H',self.read(2))[0]
        elif size==127: size=struct.unpack('!Q',self.read(8))[0]
        return json.loads(self.read(size))
    def call(self,action,data=None,error=False):
        self.sequence+=1; self.send({'id':self.sequence,'action':action,'data':data or {}})
        while True:
            packet=self.receive()
            if packet.get('id')==self.sequence:
                assert ('error' in packet)==error,packet
                return packet.get('result',packet.get('error'))
            self.events.append(packet)
    def patch(self,field):
        while True:
            p=self.events.pop(0) if self.events else self.receive()
            if p.get('type')=='patch' and field in p:return p
    def close(self):self.socket.close()

if __name__=='__main__':
    try:
        rejected=Client('https://untrusted.example');rejected.call('sync')
        raise AssertionError('Untrusted origin accepted')
    except (ConnectionError,ConnectionResetError,BrokenPipeError):pass
    finally:
        if 'rejected' in locals():rejected.close()
    first,second=Client(),Client()
    state=first.call('sync')['state']; users={u['name']:u['id'] for u in state['users']}; assert state['projects'] and state['chats']
    folders=first.call('projectFolders')
    assert folders['parent'] is None and all(not f['name'].startswith('.') for f in folders['folders'])
    first.call('projectFolders', {'path':'/does-not-exist-crabase'}, error=True)
    first.call('unknown',error=True)
    first.call('create',{'project_id':'missing'},error=True)
    first.call('create',{'title':' '},error=True)
    first.call('project',{'name':'Missing','path':'/does-not-exist-crabase'},error=True)
    chat=first.call('create',{'title':'WebSocket check '+uuid.uuid4().hex[:6]})['id'];folder_chat=None
    try:
        assert first.call('sync',{'chat_id':chat})['thread']['chat']['project_id'] is None
        second.call('sync',{'chat_id':chat});first.events.clear();second.events.clear()
        first.call('message',{'chat_id':chat,'body':' ','mode':'note'},error=True)
        first.call('message',{'chat_id':chat,'body':'check','mode':'invalid'},error=True)
        body='Live note '+uuid.uuid4().hex
        first.call('message',{'chat_id':chat,'body':body,'mode':'note','user_id':users['user1']})
        update=second.patch('messages');assert update['chat_id']==chat and update['messages'][0]['body']==body
        assert update['messages'][0]['author']=='user1'
        message_id=update['messages'][0]['id']
        # Use the same Store append as Codex, targeting only our disposable test note.
        subprocess.run(['php','-r',"require 'vendor/autoload.php'; app\\service\\Store::run('UPDATE messages SET body=body || ? WHERE id=?', [' streamed', (int)$argv[1]]);",str(message_id)],cwd=Path(__file__).resolve().parents[1],check=True)
        delta=second.patch('append');assert delta['append']==[{'id':message_id,'delta':' streamed'}]
        assert 'messages' not in delta and 'state' not in delta,'Delta resent history or workspace'
        second.close();second=Client();restored=second.call('sync',{'chat_id':chat})['thread']
        assert restored['messages'][0]['body']==body+' streamed' and restored['chat']['thread_id'] is None
        second.call('message',{'chat_id':chat,'body':'Reply from second test user','mode':'note','user_id':users['user2']})
        both=first.call('sync',{'chat_id':chat})['thread']['messages']
        assert [m['author'] for m in both]==['user1','user2']
        # Publishing pushes the file list to subscribers and survives reconnect/sync.
        with tempfile.TemporaryDirectory() as temp:
            source=Path(temp)/'report.csv'; source.write_text('name,value\ntest,1\n')
            server=Path(__file__).resolve().parents[1]
            published=json.loads(subprocess.check_output(['php','bin/publish-artifact.php',chat,str(source)],cwd=server))
            artifact_root=Path(subprocess.check_output(['php','-r',"require 'vendor/autoload.php'; echo app\\service\\Artifacts::root();"],cwd=server).decode())
            try:
                files=second.patch('artifacts')['artifacts']
                assert len(files)==1 and files[0]['url']==published['url']
                assert files[0]['size']==source.stat().st_size
                assert first.call('sync',{'chat_id':chat})['thread']['artifacts']==files
            finally:
                (artifact_root/chat/published['name']).unlink()
                (artifact_root/chat).rmdir()
        first.call('archive',{'chat_id':chat,'archived':True})
        first.call('message',{'chat_id':chat,'body':'must not save','mode':'note'},error=True)
        first.call('archive',{'chat_id':chat,'archived':False})
        assert second.call('sync',{'chat_id':chat})['thread']['chat']['archived']==0
        folder_chat=first.call('create',{'title':'Folder thread check','project_id':state['projects'][0]['id']})['id']
        assert first.call('sync',{'chat_id':folder_chat})['thread']['chat']['project_id']==state['projects'][0]['id']
    finally:
        first.call('archive',{'chat_id':chat,'archived':True})
        if folder_chat:first.call('archive',{'chat_id':folder_chat,'archived':True})
        first.close();second.close()
    print('PASS: WebSocket commands, origin/validation, two-client push, text-only deltas, reconnect persistence, archive/restore, standalone chats and folder threads.')
