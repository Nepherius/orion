const { spawnSync } = require('child_process');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
    ...options,
  });

  if (result.error) {
    console.error(`Failed to start ${command} ${args.join(' ')}:`);
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npm', ['run', 'test:all']);

if (process.platform === 'linux') {
  run('./scripts/tauri-dev-linux-safe.sh');
} else {
  run('tauri', ['dev']);
}