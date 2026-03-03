#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rawDir = path.join(__dirname, '../public/assets/raw');
const creaturesDir = path.join(__dirname, '../public/assets/creatures');
const planetsDir = path.join(__dirname, '../public/assets/planets');
const medicalDir = path.join(__dirname, '../public/assets/medical');
const armorDir = path.join(__dirname, '../public/assets/armor');

// Ensure output directories exist
[creaturesDir, planetsDir, medicalDir, armorDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Check if raw directory exists
if (!fs.existsSync(rawDir)) {
  console.error(`Raw directory not found: ${rawDir}`);
  process.exit(1);
}

// Read all CSV files from raw directory
const csvFiles = fs
  .readdirSync(rawDir)
  .filter((file) => file.endsWith('.csv'))
  .map((file) => path.join(rawDir, file));

console.log(`Found ${csvFiles.length} CSV files in raw/`);

const creatures = new Set();
const planets = new Set();
const medicalTools = new Map();
const armorItems = new Set();

// Process each CSV file
csvFiles.forEach((filePath) => {
  const filename = path.basename(filePath);
  console.log(`Processing: ${filename}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Determine file type and process accordingly
  if (filename.match(/^creatures\d+\.csv$/i)) {
    // Creatures files: creature_name;level;planet;... format
    processCreaturesFile(lines, creatures, planets);
  } else if (filename.match(/^FAP\.csv$/i)) {
    // FAP (medical tools): extract medical tool data
    processMedicalFile(lines, medicalTools);
  } else if (filename.match(/^Armor\.csv$/i)) {
    // Armor: extract armor data
    processArmorFile(lines, armorItems);
  } else {
    console.log(`  ⚠ Unknown file type, skipping: ${filename}`);
  }
});

// Process creatures CSV
function processCreaturesFile(lines, creatures, planets) {
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
}

// Process FAP (medical tools) CSV
function processMedicalFile(lines, medicalTools) {
  if (!lines.length) return;

  const headers = lines[0].split(';').map((header) => header.trim());
  const normalizedHeaders = headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const nameIndex = normalizedHeaders.indexOf('name');
  const typeIndex = normalizedHeaders.indexOf('type');
  const ttIndex = normalizedHeaders.indexOf('maxtt');
  const decayIndex = normalizedHeaders.indexOf('decay');
  const meIndex = normalizedHeaders.indexOf('me');
  const costIndex = normalizedHeaders.indexOf('cost');

  if (nameIndex === -1) {
    console.log('  ⚠ FAP.csv missing Name column, skipping medical tools extraction');
    return;
  }

  const getField = (parts, index) => {
    if (index === -1 || index >= parts.length) return '';
    return parts[index].trim();
  };

  const parseNumberOrNull = (value) => {
    if (!value) return null;
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length <= nameIndex) continue;

    const toolName = parts[nameIndex].trim();
    if (toolName) {
      const typeRaw = getField(parts, typeIndex);
      const normalizedType = typeRaw ? typeRaw.toLowerCase() : null;
      const meValue = parseNumberOrNull(getField(parts, meIndex));
      const costValue = parseNumberOrNull(getField(parts, costIndex));
      const mecost = meValue && meValue > 0 && costValue !== null ? Number((costValue / meValue).toFixed(6)) : 0;
      medicalTools.set(toolName, {
        name: toolName,
        type: normalizedType,
        tt: parseNumberOrNull(getField(parts, ttIndex)),
        markup: 100,
        decay: parseNumberOrNull(getField(parts, decayIndex)),
        me: meValue,
        mecost,
      });
    }
  }
}

// Process Armor CSV
function processArmorFile(lines, armorItems) {
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length < 1) continue;

    const armorName = parts[0].trim();
    if (armorName) {
      armorItems.add(armorName);
    }
  }
}

// Convert to sorted arrays
const creaturesList = Array.from(creatures).sort();
const planetsList = Array.from(planets).sort();
const medicalToolsList = Array.from(medicalTools.values()).sort((a, b) => a.name.localeCompare(b.name));
const armorList = Array.from(armorItems).sort();

// Write creatures.json
if (creaturesList.length > 0) {
  const creaturesJson = {
    creatures: creaturesList,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(creaturesDir, 'creatures.json'), JSON.stringify(creaturesJson, null, 2));
  console.log(`\n✓ Created creatures.json (${creaturesList.length} creatures)`);
  console.log('First 10 creatures:', creaturesList.slice(0, 10));
} else {
  console.log('\n⚠ No creature data found');
}

// Write planets.json
if (planetsList.length > 0) {
  const planetsJson = {
    planets: planetsList,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(planetsDir, 'planets.json'), JSON.stringify(planetsJson, null, 2));
  console.log(`✓ Created planets.json (${planetsList.length} planets)`);
  console.log('First 10 planets:', planetsList.slice(0, 10));
} else {
  console.log('⚠ No planet data found');
}

// Write medicaltool.json
if (medicalToolsList.length > 0) {
  const medicalJson = {
    medicalTools: medicalToolsList,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(medicalDir, 'medicaltool.json'), JSON.stringify(medicalJson, null, 2));
  console.log(`\n✓ Created medicaltool.json (${medicalToolsList.length} tools)`);
  console.log('First 10 medical tools:', medicalToolsList.slice(0, 10).map((tool) => tool.name));
} else {
  console.log('\n⚠ No medical tool data found');
}

// Write armor.json
if (armorList.length > 0) {
  const armorJson = {
    armor: armorList,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(armorDir, 'armor.json'), JSON.stringify(armorJson, null, 2));
  console.log(`\n✓ Created armor.json (${armorList.length} armor items)`);
  console.log('First 10 armor items:', armorList.slice(0, 10));
} else {
  console.log('\n⚠ No armor data found');
}
