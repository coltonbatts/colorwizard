use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

const LICENSE_SALT: &str = "colorwizard-desktop-2026";
const LICENSE_KEY_PREFIX: &str = "CW-";

/// Simple checksum: sum all char byte values, XOR with salt hash, last 4 hex chars.
/// Matches the JavaScript implementation in scripts/generate-key.mjs
fn simple_hash(input: &str) -> u32 {
    let mut hash: u32 = 5381;
    for byte in input.bytes() {
        hash = hash.wrapping_mul(33).wrapping_add(byte as u32);
    }
    hash
}

/// Validate a license key and return true if it matches the expected pattern.
/// Format: CW-XXXX-XXXX-XXXX where XXXX are hex digits.
/// The last 4 digits are djb2 hash of (salt + first 8 hex chars).
pub fn validate_license_key(key: &str) -> bool {
    if !key.starts_with(LICENSE_KEY_PREFIX) {
        return false;
    }

    let parts: Vec<&str> = key[3..].split('-').collect();
    if parts.len() != 3 {
        return false;
    }

    // Each part must be exactly 4 hex chars
    for part in &parts {
        if part.len() != 4 {
            return false;
        }
        if !part.chars().all(|c| c.is_ascii_hexdigit()) {
            return false;
        }
    }

    // First two groups encode the random value
    let value_str = format!("{}{}", parts[0], parts[1]);

    // Third group encodes the checksum
    let checksum_str = parts[2].to_lowercase();
    let expected_checksum = compute_checksum(&value_str);
    checksum_str == expected_checksum
}

fn compute_checksum(value: &str) -> String {
    let hash = simple_hash(&format!("{}{}", LICENSE_SALT, value));
    format!("{:04x}", hash & 0xFFFF)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_known_key_is_valid() {
        // Manually generated valid key (djb2 hash, matches JS generator)
        assert!(validate_license_key("CW-A1B2-C3D4-6627"));
        assert!(validate_license_key("CW-BEEF-0000-E385"));
        assert!(validate_license_key("CW-CAFE-0000-D582"));
    }

    #[test]
    fn test_invalid_key_format() {
        assert!(!validate_license_key("INVALID"));
        assert!(!validate_license_key("CW-XXXX-XXXX-XXXX")); // non-hex
        assert!(!validate_license_key("CW-1234-5678")); // missing group
        assert!(!validate_license_key("XX-1234-5678-ABCD")); // wrong prefix
    }

    #[test]
    fn test_wrong_checksum_rejected() {
        assert!(!validate_license_key("CW-1234-5678-FFFF"));
    }
}
