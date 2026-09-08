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
    phinx(path, 'migrate')
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO projects VALUES ('test','Test','/test')")
        db.execute("INSERT INTO chats (id,title,created_at,updated_at) VALUES ('1234567890abcdef','Preserve me','2026-09-09','2026-09-09')")
        # Simulate the pre-Phinx database: current schema and data, no migration log.
        db.execute('DROP TABLE phinxlog')
    phinx(path, 'migrate')
    phinx(path, 'migrate')
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT title FROM chats').fetchall() == [('Preserve me',)]
        assert db.execute('SELECT count(*) FROM phinxlog').fetchone() == (1,)
    phinx(path, 'rollback')
    with sqlite3.connect(path) as db:
        assert not db.execute("SELECT name FROM sqlite_master WHERE name='chats'").fetchall()
        assert db.execute('SELECT count(*) FROM phinxlog').fetchone() == (0,)
    phinx(path, 'migrate')
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
