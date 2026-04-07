#!/usr/bin/env node
/**
 * Paint Data Validation Script
 *
 * Validates all paint data files against the manifest:
 * - Verifies checksums match actual file content
 * - Validates JSON schema for all paint files
 * - Reports missing or corrupted files
 *
 * Usage: node scripts/validate-paints.mjs
 *    or: npm run validate:paints
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'paints');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

/**
 * Calculate SHA256 checksum of a file.
 * @param {string} filePath
 * @returns {string}
 */
function calculateChecksum(filePath) {
  const content = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Validate a single paint data file.
 * @param {string} filePath
 * @param {string | undefined} expectedChecksum
 * @returns {{
 *   file: string,
 *   valid: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   checksumValid?: boolean,
 *   paintCount?: number,
 * }}
 */
function validatePaintFile(filePath, expectedChecksum) {
  const result = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!fs.existsSync(filePath)) {
    result.valid = false;
    result.errors.push('File not found');
    return result;
  }

  if (expectedChecksum) {
    const actualChecksum = calculateChecksum(filePath);
    result.checksumValid = actualChecksum === expectedChecksum;
    if (!result.checksumValid) {
      result.warnings.push(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
    }
  }

  let data;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    result.valid = false;
    result.errors.push(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }

  if (!data || typeof data !== 'object') {
    result.valid = false;
    result.errors.push('Data must be an object');
    return result;
  }

  const obj = /** @type {Record<string, unknown>} */ (data);

  if (!obj.brand || typeof obj.brand !== 'object') {
    result.errors.push('Missing or invalid "brand" field');
    result.valid = false;
  } else {
    const brand = /** @type {Record<string, unknown>} */ (obj.brand);
    if (!brand.id) result.errors.push('Brand missing "id"');
    if (!brand.name) result.errors.push('Brand missing "name"');
  }

  if (!obj.line || typeof obj.line !== 'object') {
    result.errors.push('Missing or invalid "line" field');
    result.valid = false;
  } else {
    const line = /** @type {Record<string, unknown>} */ (obj.line);
    if (!line.id) result.errors.push('Line missing "id"');
    if (!line.name) result.errors.push('Line missing "name"');
    if (!['student', 'professional', 'premium'].includes(/** @type {string} */ (line.quality))) {
      result.errors.push('Line has invalid "quality"');
    }
  }

  if (!obj.paints || !Array.isArray(obj.paints)) {
    result.errors.push('Missing or invalid "paints" array');
    result.valid = false;
  } else {
    result.paintCount = obj.paints.length;

    for (let index = 0; index < obj.paints.length; index += 1) {
      const paint = /** @type {Record<string, unknown>} */ (obj.paints[index]);
      const prefix = `Paint[${index}]`;

      if (!paint.name) result.errors.push(`${prefix}: Missing "name"`);
      if (!paint.hex) result.errors.push(`${prefix}: Missing "hex"`);
      if (!paint.pigmentCodes || !Array.isArray(paint.pigmentCodes)) {
        result.errors.push(`${prefix}: Missing or invalid "pigmentCodes"`);
      }
      if (!['transparent', 'semi-transparent', 'semi-opaque', 'opaque'].includes(/** @type {string} */ (paint.opacity))) {
        result.errors.push(`${prefix}: Invalid "opacity"`);
      }
      if (!['fugitive', 'moderately-durable', 'permanent', 'extremely-permanent'].includes(/** @type {string} */ (paint.permanence))) {
        result.errors.push(`${prefix}: Invalid "permanence"`);
      }
    }
  }

  if (result.errors.length > 0) {
    result.valid = false;
  }

  return result;
}

function main() {
  console.log('Paint Data Validation\n');
  console.log('='.repeat(60) + '\n');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Manifest not found at:', MANIFEST_PATH);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch (error) {
    console.error('Failed to parse manifest:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }

  console.log(`Manifest v${manifest.version} (${manifest.lastUpdated})`);
  console.log(`   ${manifest.sources.length} source(s) registered\n`);

  let hasErrors = false;
  const results = [];

  for (const source of manifest.sources) {
    const filePath = path.join(DATA_DIR, source.path);
    const relativePath = source.path;

    console.log(`\n${relativePath}`);

    const result = validatePaintFile(filePath, source.checksum);
    results.push(result);

    if (result.valid) {
      console.log(`   Valid (${result.paintCount} paints)`);
      if (result.checksumValid === false) {
        console.log('   Checksum mismatch - consider updating manifest');
      }
    } else {
      hasErrors = true;
      console.log('   Invalid');
      for (const error of result.errors) {
        console.log(`      - ${error}`);
      }
    }

    for (const warning of result.warnings) {
      console.log(`   Warning: ${warning}`);
    }

    if (result.paintCount !== undefined && result.paintCount !== source.paintCount) {
      console.log(`   Paint count mismatch: manifest says ${source.paintCount}, file has ${result.paintCount}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('\nSummary\n');

  const validCount = results.filter((result) => result.valid).length;
  const totalPaints = results.reduce((sum, result) => sum + (result.paintCount || 0), 0);

  console.log(`   Files: ${validCount}/${results.length} valid`);
  console.log(`   Total paints: ${totalPaints}`);

  if (hasErrors) {
    console.log('\nValidation failed - see errors above\n');
    process.exit(1);
  }

  console.log('\nAll files valid\n');
}

main();
