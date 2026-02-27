const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'chat.log');
if (!fs.existsSync(file)) {
  console.error('chat.log not found at', file);
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/).filter(Boolean);

const systemRe = /You received (?:\[(.+?)\]|(.+?)) x \([\d,]+\) Value: ([\d.]+) PED/;
const globalRe = /\[Globals\] \[\] (.+?) (a ucis o creatură|killed a creature|has killed) \((.+?)\) (cu o valoare de|with a value of) ([\d.]+) PED/;
const miningRe = /\[Globals\] \[\] (.+?) (a găsit un depozit|found a deposit|has found) \((.+?)\) (cu o valoare de|with a value of) ([\d.]+) PED/;

console.log('Testing', lines.length, 'lines from', file);

for (const [i, line] of lines.entries()) {
  let matched = false;
  let m;

  m = globalRe.exec(line);
  if (m) {
    console.log(`L${i+1}: GLOBAL -> player='${m[1]}', creature='${m[3]}', value=${m[5]}`);
    matched = true;
  }

  m = miningRe.exec(line);
  if (m) {
    console.log(`L${i+1}: MINING -> player='${m[1]}', deposit='${m[3]}', value=${m[5]}`);
    matched = true;
  }

  m = systemRe.exec(line);
  if (m) {
    const item = (m[1] || m[2] || '').trim();
    console.log(`L${i+1}: SYSTEM -> item='${item}', value=${m[3]}`);
    matched = true;
  }

  if (!matched) {
    // Print a short excerpt for debugging
    console.log(`L${i+1}: NO MATCH -> ${line}`);
  }
}
