#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const creaturesDir = path.join(__dirname, '../public/assets/creatures');

// Read all CSV files from creatures directory
const csvFiles = fs
  .readdirSync(creaturesDir)
  .filter((file) => file.endsWith('.csv'))
  .map((file) => path.join(creaturesDir, file));

console.log(`Found ${csvFiles.length} CSV files`);

const creatures = new Set();
const planets = new Set();

// Process each CSV file
csvFiles.forEach((filePath) => {
  console.log(`Processing: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length < 3) continue;

    const creatureName = parts[0].trim();
    const planetName = parts[2].trim();

    if (creatureName) {
      creatures.add(creatureName);
    }

    // Add planet if not empty and not "Various"
    if (planetName && planetName !== 'Various') {
      planets.add(planetName);
    }
  }
});

// Sort and convert to arrays
const creaturesList = Array.from(creatures).sort();
const planetsList = Array.from(planets).sort();

console.log(`\nExtracted ${creaturesList.length} unique creatures`);
console.log(`Extracted ${planetsList.length} unique planets`);

// Write creatures.json
const creaturesJson = {
  creatures: creaturesList,
  lastUpdated: new Date().toISOString(),
};

fs.writeFileSync(path.join(creaturesDir, 'creatures.json'), JSON.stringify(creaturesJson, null, 2));
console.log('\n✓ Created creatures.json');

// Write planets.json
const planetsJson = {
  planets: planetsList,
  lastUpdated: new Date().toISOString(),
};

fs.writeFileSync(path.join(creaturesDir, 'planets.json'), JSON.stringify(planetsJson, null, 2));
console.log('✓ Created planets.json');

console.log('\nFirst 10 creatures:', creaturesList.slice(0, 10));
console.log('First 10 planets:', planetsList.slice(0, 10));
