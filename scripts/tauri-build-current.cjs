const { spawnSync } = require('child_process');

const script =
  process.platform === 'win32'
    ? 'tauri:build:windows'
    : process.platform === 'linux'
      ? 'tauri:build:linux'
      : null;

if (!script) {
  console.error(`Unsupported release build platform: ${process.platform}`);
  console.error('Use tauri directly if you need to build for this platform.');
  process.exit(1);
}

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(command, ['run', script], {
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
