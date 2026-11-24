import {spawn, execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BACKEND_BIN = path.join(ROOT, 'backend', 'build', 'backend', 'textile_server');
const BACKEND_PORT = process.env.BACKEND_PORT || '8081';

function runCmd(cmd) {
  return execSync(cmd, {cwd: ROOT, stdio: 'pipe'}).toString().trim();
}

function hasBinary(name) {
  try {
    runCmd(`command -v ${name}`);
    return true;
  } catch {
    return false;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureDatabaseAndBackend() {
  try {
    if (!hasBinary('mariadbd') || !hasBinary('cmake')) {
      console.log('[EcoWeave] Installing MariaDB and C++ build dependencies...');
      runCmd(
        'apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq cmake default-libmysqlclient-dev libasio-dev libssl-dev mariadb-server',
      );
    }

    runCmd('mkdir -p /run/mysqld && chown mysql:mysql /run/mysqld');
    if (!fs.existsSync('/var/lib/mysql/mysql')) {
      console.log('[EcoWeave] Initializing MariaDB data directory...');
      runCmd('mysql_install_db --user=mysql --datadir=/var/lib/mysql');
    }

    let dbRunning = false;
    try {
      runCmd('pgrep -x mariadbd');
      dbRunning = true;
    } catch {
      dbRunning = false;
    }

    if (!dbRunning) {
      console.log('[EcoWeave] Starting MariaDB daemon...');
      const dbProc = spawn(
        'mariadbd',
        [
          '--user=mysql',
          '--datadir=/var/lib/mysql',
          '--socket=/run/mysqld/mysqld.sock',
          '--bind-address=127.0.0.1',
          '--port=3306',
        ],
        {cwd: ROOT, stdio: 'ignore', detached: true},
      );
      dbProc.unref();

      for (let i = 0; i < 20; i++) {
        try {
          runCmd('mysqladmin -u root -S /run/mysqld/mysqld.sock ping');
          break;
        } catch {
          await sleep(500);
        }
      }
    }

    let dbSeeded = false;
    try {
      const cnt = runCmd(
        "mysql -u root -S /run/mysqld/mysqld.sock -Nse \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sustainable_textile_db' AND table_name='Users';\"",
      );
      dbSeeded = Number(cnt) > 0;
    } catch {
      dbSeeded = false;
    }

    if (!dbSeeded) {
      console.log('[EcoWeave] Provisioning MySQL schema & sample data...');
      runCmd(
        'mysql -u root -S /run/mysqld/mysqld.sock -e "CREATE DATABASE IF NOT EXISTS sustainable_textile_db; CREATE USER IF NOT EXISTS \'textile_user\'@\'127.0.0.1\' IDENTIFIED BY \'textile_pass\'; CREATE USER IF NOT EXISTS \'textile_user\'@\'localhost\' IDENTIFIED BY \'textile_pass\'; GRANT ALL PRIVILEGES ON sustainable_textile_db.* TO \'textile_user\'@\'127.0.0.1\'; GRANT ALL PRIVILEGES ON sustainable_textile_db.* TO \'textile_user\'@\'localhost\'; FLUSH PRIVILEGES;"',
      );
      runCmd('mysql -u root -S /run/mysqld/mysqld.sock < database/schema.sql');
      runCmd('mysql -u root -S /run/mysqld/mysqld.sock < database/sample_data.sql');
    }

    if (!fs.existsSync(BACKEND_BIN)) {
      console.log('[EcoWeave] Compiling C++17 Crow backend...');
      runCmd('cmake -S . -B backend/build && cmake --build backend/build -j2');
    }

    let serverRunning = false;
    try {
      runCmd('pgrep -x textile_server');
      serverRunning = true;
    } catch {
      serverRunning = false;
    }

    if (!serverRunning) {
      console.log(`[EcoWeave] Starting C++17 Crow backend on port ${BACKEND_PORT}...`);
      const logFd = fs.openSync('/tmp/textile_server.log', 'a');
      const cppProc = spawn(BACKEND_BIN, [], {
        cwd: ROOT,
        env: {...process.env, BACKEND_PORT},
        stdio: ['ignore', logFd, logFd],
        detached: true,
      });
      cppProc.unref();
    }
  } catch (err) {
    console.error('[EcoWeave] Backend bootstrap warning:', err instanceof Error ? err.message : err);
  }
}

// Start Vite immediately on port 3000 so the preview server responds without delay
const viteArgs = ['vite', '--port=3000', '--host=0.0.0.0'];
const viteProc = spawn('npx', viteArgs, {
  cwd: ROOT,
  env: {...process.env, BACKEND_PORT},
  stdio: 'inherit',
});

viteProc.on('exit', (code) => {
  process.exit(code ?? 0);
});

void ensureDatabaseAndBackend();
