pub(crate) fn hit(name: &str) {
    #[cfg(test)]
    {
        if std::env::var("RUNTIME_HUMAN_PERSISTENCE_FAILPOINT").as_deref() == Ok(name) {
            std::process::exit(86);
        }
    }

    #[cfg(not(test))]
    let _ = name;
}
