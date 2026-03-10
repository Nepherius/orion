// Syncs version from package.json to tauri.conf.json, Cargo.toml, and PKGBUILD
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packageJsonPath = path.join(root, 'package.json');
const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json');
const cargoTomlPath = path.join(root, 'src-tauri', 'Cargo.toml');
const pkgbuildPath = path.join(root, 'packaging', 'arch', 'PKGBUILD');

// Read version from package.json
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = pkg.version;

// Update tauri.conf.json
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');

// Update Cargo.toml
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
cargoToml = cargoToml.replace(/version\s*=\s*"[^"]+"/, `version = "${version}"`);
fs.writeFileSync(cargoTomlPath, cargoToml);

// Update PKGBUILD
if (fs.existsSync(pkgbuildPath)) {
  let pkgbuild = fs.readFileSync(pkgbuildPath, 'utf8');
  pkgbuild = pkgbuild.replace(/pkgver=.+/, `pkgver=${version}`);
  fs.writeFileSync(pkgbuildPath, pkgbuild);
}

console.log(`Synced version to ${version} in tauri.conf.json, Cargo.toml, and PKGBUILD.`);
