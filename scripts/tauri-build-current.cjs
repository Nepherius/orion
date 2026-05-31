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

console.log(`Detected platform: ${process.platform}`);
console.log(`Running release build script: ${script}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`PATH: ${process.env.PATH}`);

// Try to find npm
const whichResult = spawnSync('where', ['npm'], { shell: true, encoding: 'utf8' });
console.log(`npm location: ${whichResult.stdout || whichResult.error}`);

const result = spawnSync('npm', ['run', script], {
  stdio: 'inherit',
  shell: true,
  env: process.env, // Explicitly pass environment
});

if (result.error) {
  console.error(`Failed to start npm script '${script}':`);
  console.error(result.error);
  console.error(`Error code: ${result.error.code}`);
  console.error(`Error message: ${result.error.message}`);
  process.exit(1);
}

console.log(`npm script exited with code: ${result.status}`);
process.exit(result.status ?? 1);