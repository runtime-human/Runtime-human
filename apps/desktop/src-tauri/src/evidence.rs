use std::{ffi::OsString, io, path::PathBuf};

const DATA_DIRECTORY_ARGUMENT_PREFIX: &str = "--runtime-human-evidence-data-dir=";
const MISSING_DATA_DIRECTORY_MESSAGE: &str =
    "performance-evidence builds require --runtime-human-evidence-data-dir=<absolute-path>";

pub(crate) fn required_app_data_directory_override() -> Result<PathBuf, io::Error> {
    parse_data_directory_argument(std::env::args_os())
        .map_err(|message| io::Error::new(io::ErrorKind::InvalidInput, message))
}

fn parse_data_directory_argument(
    arguments: impl IntoIterator<Item = OsString>,
) -> Result<PathBuf, &'static str> {
    let mut parsed = None;

    for argument in arguments {
        let Some(value) = argument
            .to_str()
            .and_then(|argument| argument.strip_prefix(DATA_DIRECTORY_ARGUMENT_PREFIX))
        else {
            continue;
        };

        if parsed.is_some() {
            return Err("--runtime-human-evidence-data-dir may be specified only once");
        }
        if value.is_empty() {
            return Err(MISSING_DATA_DIRECTORY_MESSAGE);
        }

        let path = PathBuf::from(value);
        if !path.is_absolute() {
            return Err("--runtime-human-evidence-data-dir must be an absolute path");
        }
        parsed = Some(path);
    }

    parsed.ok_or(MISSING_DATA_DIRECTORY_MESSAGE)
}

#[cfg(test)]
mod tests {
    use std::{ffi::OsString, path::PathBuf};

    use super::parse_data_directory_argument;

    fn absolute_test_directory() -> PathBuf {
        std::env::temp_dir().join("runtime-human-evidence")
    }

    #[test]
    fn accepts_only_the_closed_absolute_evidence_data_directory_argument() {
        let expected = absolute_test_directory();
        let parsed = parse_data_directory_argument([
            OsString::from("runtime-human-desktop.exe"),
            OsString::from("--unrelated=value"),
            OsString::from(format!(
                "--runtime-human-evidence-data-dir={}",
                expected.display()
            )),
        ]);

        assert_eq!(parsed, Ok(expected));
    }

    #[test]
    fn rejects_missing_empty_relative_or_duplicate_evidence_directory() {
        assert!(
            parse_data_directory_argument([OsString::from("runtime-human-desktop.exe")]).is_err()
        );
        assert!(
            parse_data_directory_argument([
                OsString::from("runtime-human-desktop.exe"),
                OsString::from("--runtime-human-evidence-data-dir="),
            ])
            .is_err()
        );
        assert!(
            parse_data_directory_argument([
                OsString::from("runtime-human-desktop.exe"),
                OsString::from("--runtime-human-evidence-data-dir=relative-path"),
            ])
            .is_err()
        );

        let first = absolute_test_directory();
        let second = std::env::temp_dir().join("runtime-human-evidence-duplicate");
        assert!(
            parse_data_directory_argument([
                OsString::from("runtime-human-desktop.exe"),
                OsString::from(format!(
                    "--runtime-human-evidence-data-dir={}",
                    first.display()
                )),
                OsString::from(format!(
                    "--runtime-human-evidence-data-dir={}",
                    second.display()
                )),
            ])
            .is_err()
        );
    }
}
