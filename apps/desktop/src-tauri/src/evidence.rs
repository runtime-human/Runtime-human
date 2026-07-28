use std::{ffi::OsString, path::PathBuf};

const DATA_DIRECTORY_ARGUMENT_PREFIX: &str = "--runtime-human-evidence-data-dir=";

pub(crate) fn app_data_directory_override() -> Option<PathBuf> {
    parse_data_directory_argument(std::env::args_os())
}

fn parse_data_directory_argument(
    arguments: impl IntoIterator<Item = OsString>,
) -> Option<PathBuf> {
    arguments.into_iter().find_map(|argument| {
        let value = argument.to_str()?.strip_prefix(DATA_DIRECTORY_ARGUMENT_PREFIX)?;
        if value.is_empty() {
            return None;
        }
        Some(PathBuf::from(value))
    })
}

#[cfg(test)]
mod tests {
    use std::{ffi::OsString, path::PathBuf};

    use super::parse_data_directory_argument;

    #[test]
    fn accepts_only_the_closed_evidence_data_directory_argument() {
        let parsed = parse_data_directory_argument([
            OsString::from("runtime-human-desktop.exe"),
            OsString::from("--unrelated=value"),
            OsString::from("--runtime-human-evidence-data-dir=C:\\temp\\runtime-human-evidence"),
        ]);

        assert_eq!(
            parsed,
            Some(PathBuf::from("C:\\temp\\runtime-human-evidence"))
        );
    }

    #[test]
    fn rejects_missing_or_empty_evidence_directory() {
        assert_eq!(
            parse_data_directory_argument([OsString::from("runtime-human-desktop.exe")]),
            None
        );
        assert_eq!(
            parse_data_directory_argument([
                OsString::from("runtime-human-desktop.exe"),
                OsString::from("--runtime-human-evidence-data-dir="),
            ]),
            None
        );
    }
}
