#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../public/assets/creatures/mobs.json');
const outputFile = path.join(__dirname, '../public/assets/creatures/creatures.json');

console.log('='.repeat(60));
console.log('Mob Stats Extractor');
console.log('='.repeat(60));
console.log('');

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error('✗ Error: mobs.json not found!');
  console.error(`  Expected at: ${inputFile}`);
  console.error('');
  console.error('  Run fetch_mob_data.cjs first to download mob data.');
  process.exit(1);
}

console.log('Reading mobs.json...');
const rawData = fs.readFileSync(inputFile, 'utf-8');
const mobs = JSON.parse(rawData);

console.log(`✓ Loaded ${mobs.length} mobs`);
console.log('');

console.log('Extracting name, maturity, and HP...');

// Extract simplified creature data
const creatures = [];
let totalMaturities = 0;

mobs.forEach((mob) => {
  if (!mob.Maturities || mob.Maturities.length === 0) {
    return; // Skip mobs with no maturities
  }

  mob.Maturities.forEach((maturity) => {
    creatures.push({
      name: mob.Name,
      maturity: maturity.Name,
      hp: maturity.Properties.Health || 0,
    });
    totalMaturities++;
  });
});

console.log(`✓ Extracted ${creatures.length} creature entries`);
console.log(`  ${mobs.length} unique mobs`);
console.log(`  ${totalMaturities} total maturities`);
console.log('');

// Sort by name, then by maturity
creatures.sort((a, b) => {
  if (a.name !== b.name) {
    return a.name.localeCompare(b.name);
  }
  return a.maturity.localeCompare(b.maturity);
});

console.log('Saving to creatures.json...');
const outputData = JSON.stringify(creatures, null, 2);
fs.writeFileSync(outputFile, outputData, 'utf-8');

console.log(`✓ Saved to: ${outputFile}`);
console.log('');

// Show sample data
console.log('Sample entries:');
creatures.slice(0, 5).forEach((creature, idx) => {
  console.log(`  ${idx + 1}. ${creature.name} (${creature.maturity}) - ${creature.hp} HP`);
});

console.log('');
console.log('='.repeat(60));
console.log('✓ Extraction complete!');
console.log('='.repeat(60));
