import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

function start(name, command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    env: { ...process.env, ...env },
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(0);
    }

    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exit(code);
    }
  });

  return child;
}

const api = start('api', 'node', ['server/api.mjs'], { API_PORT: '8787' });
const client = start('client', 'node', ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0']);

function stop() {
  api.kill();
  client.kill();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
