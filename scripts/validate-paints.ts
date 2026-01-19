#!/usr/bin/env node
/**
 * Paint Data Validation Script
 * 
 * Validates all paint data files against the manifest:
 * - Verifies checksums match actual file content
 * - Validates JSON schema for all paint files
 * - Reports missing or corrupted files
 * 
 * Usage: npx ts-node scripts/validate-paints.ts
 *    or: npm run validate:paints
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

interface ManifestSource {
    path: string;
    brand: string;
    line: string;
    medium?: string;
    checksum: string;
    paintCount: number;
    addedAt: string;
    source?: string;
}

interface Manifest {
    version: string;
    lastUpdated: string;
    description?: string;
    sources: ManifestSource[];
}

interface ValidationResult {
    file: string;
    valid: boolean;
    errors: string[];
    warnings: string[];
    checksumValid?: boolean;
    paintCount?: number;
}

// ============================================================================
// Validation
// ============================================================================

const DATA_DIR = path.join(process.cwd(), 'data', 'paints');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

/**
 * Calculate SHA256 checksum of a file.
 */
function calculateChecksum(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Validate a single paint data file.
 */
function validatePaintFile(filePath: string, expectedChecksum?: string): ValidationResult {
    const result: ValidationResult = {
        file: filePath,
        valid: true,
        errors: [],
        warnings: []
    };

    // Check file exists
    if (!fs.existsSync(filePath)) {
        result.valid = false;
        result.errors.push('File not found');
        return result;
    }

    // Verify checksum if provided
    if (expectedChecksum) {
        const actualChecksum = calculateChecksum(filePath);
        result.checksumValid = actualChecksum === expectedChecksum;
        if (!result.checksumValid) {
            result.warnings.push(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
        }
    }

    // Parse JSON
    let data: unknown;
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(content);
    } catch (e) {
        result.valid = false;
        result.errors.push(`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
        return result;
    }

    // Validate structure
    if (!data || typeof data !== 'object') {
        result.valid = false;
        result.errors.push('Data must be an object');
        return result;
    }

    const obj = data as Record<string, unknown>;

    // Validate brand
    if (!obj.brand || typeof obj.brand !== 'object') {
        result.errors.push('Missing or invalid "brand" field');
        result.valid = false;
    } else {
        const brand = obj.brand as Record<string, unknown>;
        if (!brand.id) result.errors.push('Brand missing "id"');
        if (!brand.name) result.errors.push('Brand missing "name"');
    }

    // Validate line
    if (!obj.line || typeof obj.line !== 'object') {
        result.errors.push('Missing or invalid "line" field');
        result.valid = false;
    } else {
        const line = obj.line as Record<string, unknown>;
        if (!line.id) result.errors.push('Line missing "id"');
        if (!line.name) result.errors.push('Line missing "name"');
        if (!['student', 'professional', 'premium'].includes(line.quality as string)) {
            result.errors.push('Line has invalid "quality"');
        }
    }

    // Validate paints array
    if (!obj.paints || !Array.isArray(obj.paints)) {
        result.errors.push('Missing or invalid "paints" array');
        result.valid = false;
    } else {
        result.paintCount = obj.paints.length;

        for (let i = 0; i < obj.paints.length; i++) {
            const paint = obj.paints[i] as Record<string, unknown>;
            const prefix = `Paint[${i}]`;

            if (!paint.name) result.errors.push(`${prefix}: Missing "name"`);
            if (!paint.hex) result.errors.push(`${prefix}: Missing "hex"`);
            if (!paint.pigmentCodes || !Array.isArray(paint.pigmentCodes)) {
                result.errors.push(`${prefix}: Missing or invalid "pigmentCodes"`);
            }
            if (!['transparent', 'semi-transparent', 'semi-opaque', 'opaque'].includes(paint.opacity as string)) {
                result.errors.push(`${prefix}: Invalid "opacity"`);
            }
            if (!['fugitive', 'moderately-durable', 'permanent', 'extremely-permanent'].includes(paint.permanence as string)) {
                result.errors.push(`${prefix}: Invalid "permanence"`);
            }
        }
    }

    if (result.errors.length > 0) {
        result.valid = false;
    }

    return result;
}

/**
 * Run full validation.
 */
function main() {
    console.log('🎨 Paint Data Validation\n');
    console.log('='.repeat(60) + '\n');

    // Check manifest exists
    if (!fs.existsSync(MANIFEST_PATH)) {
        console.error('❌ Manifest not found at:', MANIFEST_PATH);
        process.exit(1);
    }

    // Load manifest
    let manifest: Manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    } catch (e) {
        console.error('❌ Failed to parse manifest:', e instanceof Error ? e.message : 'Unknown error');
        process.exit(1);
    }

    console.log(`📋 Manifest v${manifest.version} (${manifest.lastUpdated})`);
    console.log(`   ${manifest.sources.length} source(s) registered\n`);

    let hasErrors = false;
    const results: ValidationResult[] = [];

    // Validate each source
    for (const source of manifest.sources) {
        const filePath = path.join(DATA_DIR, source.path);
        const relativePath = source.path;

        console.log(`\n📁 ${relativePath}`);

        const result = validatePaintFile(filePath, source.checksum);
        results.push(result);

        if (result.valid) {
            console.log(`   ✅ Valid (${result.paintCount} paints)`);
            if (result.checksumValid === false) {
                console.log(`   ⚠️  Checksum mismatch - consider updating manifest`);
            }
        } else {
            hasErrors = true;
            console.log(`   ❌ Invalid`);
            for (const error of result.errors) {
                console.log(`      - ${error}`);
            }
        }

        for (const warning of result.warnings) {
            console.log(`   ⚠️  ${warning}`);
        }

        // Check paint count matches manifest
        if (result.paintCount !== undefined && result.paintCount !== source.paintCount) {
            console.log(`   ⚠️  Paint count mismatch: manifest says ${source.paintCount}, file has ${result.paintCount}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary\n');

    const validCount = results.filter(r => r.valid).length;
    const totalPaints = results.reduce((sum, r) => sum + (r.paintCount || 0), 0);

    console.log(`   Files: ${validCount}/${results.length} valid`);
    console.log(`   Total paints: ${totalPaints}`);

    if (hasErrors) {
        console.log('\n❌ Validation failed - see errors above\n');
        process.exit(1);
    } else {
        console.log('\n✅ All files valid!\n');
        process.exit(0);
    }
}

main();
