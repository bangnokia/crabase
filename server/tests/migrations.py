"""Exercise Phinx on disposable SQLite databases, never the workspace database."""
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile

server = Path(__file__).resolve().parents[1]

def phinx(path, *args, success=True):
    result = subprocess.run(['php', str(server/'vendor/bin/phinx'), *args, '-c', str(server/'phinx.php')], env={**os.environ, 'CRABASE_DB': str(path)}, capture_output=True, text=True)
    assert (result.returncode == 0) == success, result.stdout + result.stderr

with tempfile.TemporaryDirectory(prefix='crabase-migrations-') as temp:
    path = Path(temp)/'test.sqlite'
    phinx(path, 'migrate', '-t', '20260909000006')
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO projects VALUES ('test','Test','/test')")
        db.execute("INSERT INTO chats (id,title,created_at,updated_at) VALUES ('1234567890abcdef','Preserve me','2026-09-09','2026-09-09')")
        # Simulate the pre-Phinx database: current schema and data, no migration log.
        db.execute('DROP TABLE phinxlog')
    phinx(path, 'migrate', '-t', '20260909000006')
    phinx(path, 'migrate', '-t', '20260909000006')
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT title FROM chats').fetchall() == [('Preserve me',)]
        assert db.execute('SELECT count(*) FROM phinxlog').fetchone() == (7,)
    phinx(path, 'rollback')
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT name FROM sqlite_master WHERE name='chats'").fetchall()
        assert not db.execute("SELECT name FROM sqlite_master WHERE name='settings'").fetchall()
        assert db.execute('SELECT count(*) FROM phinxlog').fetchone() == (6,)
    phinx(path, 'migrate', '-t', '20260909000006')
    # The previous combined baseline used the first version. Keep its log row.
    with sqlite3.connect(path) as db:
        db.execute('DELETE FROM phinxlog WHERE version != 20260909000000')
        db.execute("UPDATE phinxlog SET migration_name='InitialSchema'")
    phinx(path, 'migrate', '-t', '20260909000006')
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT title FROM chats').fetchall() == [('Preserve me',)]
        assert db.execute('SELECT count(*) FROM phinxlog').fetchone() == (7,)
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO messages (chat_id,role,author,body,created_at) VALUES ('1234567890abcdef','user','Historical person','Keep this','2026-09-09')")
    phinx(path, 'migrate')
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT users.name FROM messages JOIN users ON users.id=messages.user_id").fetchall() == [('Historical person',)]
        assert db.execute('SELECT count(*) FROM users').fetchone() == (3,)
        assert 'user_id' in [c[1] for c in db.execute('PRAGMA table_info(messages)')]
    phinx(path, 'rollback', '-t', '20260909000007')
    with sqlite3.connect(path) as db:
        assert 'user_id' not in [c[1] for c in db.execute('PRAGMA table_info(messages)')]
    phinx(path, 'migrate')
    phinx(path, 'rollback', '-t', '0')
    with sqlite3.connect(path) as db:
        assert not db.execute("SELECT name FROM sqlite_master WHERE name='chats'").fetchall()
        assert db.execute('SELECT count(*) FROM phinxlog').fetchone() == (0,)
    phinx(path, 'migrate', '-t', '20260909000006')
    phinx(path, 'seed:run')
    phinx(path, 'seed:run')
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT count(*) FROM projects').fetchone() == (1,)
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []
    bad = Path(temp)/'incompatible.sqlite'
    with sqlite3.connect(bad) as db:
        db.execute('CREATE TABLE projects (id TEXT PRIMARY KEY)')
        db.execute("INSERT INTO projects VALUES ('keep')")
    phinx(bad, 'migrate', success=False)
    with sqlite3.connect(bad) as db:
        assert db.execute('SELECT * FROM projects').fetchall() == [('keep',)]
        assert not db.execute("SELECT name FROM sqlite_master WHERE name='chats'").fetchall()
        assert db.execute('SELECT count(*) FROM phinxlog').fetchone() == (0,)
print('PASS: Phinx fresh schema, existing-data adoption, idempotence, rollback/reapply, seed, failed migration rollback.')
