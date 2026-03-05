#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_BASE = 'https://api.entropianexus.com';
const USER_AGENT = 'Orion-Loot-Tracker/1.1.0';

// Output directory for mob data
const creaturesDir = path.join(__dirname, '../public/assets/creatures');

// Ensure output directory exists
if (!fs.existsSync(creaturesDir)) {
  fs.mkdirSync(creaturesDir, { recursive: true });
  console.log(`Created directory: ${creaturesDir}`);
}

/**
 * Fetch data from Entropia Nexus API
 * @param {string} endpoint - API endpoint (e.g., '/mobs')
 * @returns {Promise<any>} - Parsed JSON response
 */
function fetchFromAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${endpoint}`;
    console.log(`Fetching: ${url}`);

    const options = {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'X-Client-Name': 'Orion',
        'X-Client-Version': '1.1.0',
      },
    };

    https
      .get(url, options, (res) => {
        let data = '';

        // Check status code
        if (res.statusCode !== 200) {
          reject(new Error(`API request failed: ${res.statusCode} ${res.statusMessage}`));
          return;
        }

        // Accumulate data chunks
        res.on('data', (chunk) => {
          data += chunk;
        });

        // Parse JSON when complete
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      })
      .on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });
  });
}

/**
 * Save data to JSON file
 * @param {string} filename - Output filename
 * @param {any} data - Data to save
 */
function saveToFile(filename, data) {
  const filePath = path.join(creaturesDir, filename);
  const jsonContent = JSON.stringify(data, null, 2);
  
  fs.writeFileSync(filePath, jsonContent, 'utf-8');
  console.log(`✓ Saved ${filename} (${data.length || 0} items)`);
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Entropia Nexus Mob Data Fetcher');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Fetch mobs data
    console.log('[1/2] Fetching mobs...');
    const mobs = await fetchFromAPI('/mobs');
    saveToFile('mobs.json', mobs);
    console.log('');

    // Fetch mob maturities data
    console.log('[2/2] Fetching mob maturities...');
    const mobMaturities = await fetchFromAPI('/mobmaturities');
    saveToFile('mobmaturities.json', mobMaturities);
    console.log('');

    console.log('='.repeat(60));
    console.log('✓ All data fetched successfully!');
    console.log('='.repeat(60));
    console.log(`Output directory: ${creaturesDir}`);
    console.log('Files created:');
    console.log('  - mobs.json');
    console.log('  - mobmaturities.json');
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('✗ Error:', error.message);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Run the script
main();
