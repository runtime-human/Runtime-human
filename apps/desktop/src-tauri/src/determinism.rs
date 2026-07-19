use rand_xoshiro::{
    Xoshiro256StarStar,
    rand_core::{RngCore, SeedableRng},
};
use serde::Deserialize;

const FIXTURE: &str = include_str!("../../../../fixtures/determinism/xoshiro256ss-v1.json");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoldenFixture {
    version: String,
    state_encoding: String,
    initial_state_hex: String,
    outputs_u64_decimal: Vec<String>,
    state_after_outputs_hex: String,
    seed42_state_hex: String,
}

#[test]
fn rand_xoshiro_matches_shared_golden_fixture() {
    let fixture: GoldenFixture = serde_json::from_str(FIXTURE).expect("fixture must be valid JSON");
    assert_eq!(fixture.version, "xoshiro256ss-v1");
    assert_eq!(fixture.state_encoding, "little-endian-32-byte-hex-v1");

    let seed = decode_state(&fixture.initial_state_hex);
    let mut random = Xoshiro256StarStar::from_seed(seed);
    let actual_outputs: Vec<String> = fixture
        .outputs_u64_decimal
        .iter()
        .map(|_| random.next_u64().to_string())
        .collect();

    assert_eq!(actual_outputs, fixture.outputs_u64_decimal);
    assert_eq!(
        encode_state(random.state()),
        fixture.state_after_outputs_hex
    );

    let seeded = Xoshiro256StarStar::seed_from_u64(42);
    assert_eq!(encode_state(seeded.state()), fixture.seed42_state_hex);
}

fn decode_state(value: &str) -> [u8; 32] {
    assert_eq!(value.len(), 64, "state must contain 32 hexadecimal bytes");

    let mut bytes = [0_u8; 32];
    for (index, byte) in bytes.iter_mut().enumerate() {
        let offset = index * 2;
        *byte = u8::from_str_radix(&value[offset..offset + 2], 16)
            .expect("state must contain lowercase hexadecimal bytes");
    }
    assert!(
        bytes.iter().any(|byte| *byte != 0),
        "state cannot be all zeroes"
    );
    bytes
}

fn encode_state(value: [u8; 32]) -> String {
    let mut encoded = String::with_capacity(64);
    for byte in value {
        use std::fmt::Write as _;
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    encoded
}
