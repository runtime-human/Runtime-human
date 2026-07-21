use std::fmt::Write;

use sha2::{Digest, Sha256};

use super::error::PersistenceError;

pub(crate) const SHA256_HEX_LENGTH: usize = 64;

pub(crate) fn sha256_hex(bytes: impl AsRef<[u8]>) -> String {
    let digest = Sha256::digest(bytes.as_ref());
    let mut hex = String::with_capacity(SHA256_HEX_LENGTH);
    for byte in digest {
        write!(&mut hex, "{byte:02x}").expect("writing to a String cannot fail");
    }
    hex
}

pub(crate) fn validate_sha256_hex(value: &str, name: &str) -> Result<(), PersistenceError> {
    if value.len() != SHA256_HEX_LENGTH
        || !value
            .as_bytes()
            .iter()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(byte))
    {
        return Err(PersistenceError::InvalidCommand(format!(
            "{name} must be a lowercase SHA-256 value"
        )));
    }
    Ok(())
}

pub(crate) fn verify_sha256(
    bytes: impl AsRef<[u8]>,
    expected: &str,
) -> Result<(), PersistenceError> {
    validate_sha256_hex(expected, "SHA-256")?;
    if sha256_hex(bytes) != expected {
        return Err(PersistenceError::PayloadHashMismatch);
    }
    Ok(())
}
