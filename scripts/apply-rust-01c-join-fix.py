from pathlib import Path

path = Path("apps/desktop/src-tauri/src/persistence/worker.rs")
text = path.read_text(encoding="utf-8")
old = '''        closed_receiver
            .recv()
            .map_err(|_| PersistenceError::Unavailable)?;
        join_worker(&self.inner.worker)
'''
new = '''        let acknowledgement = closed_receiver
            .recv()
            .map_err(|_| PersistenceError::Unavailable);
        let worker_result = join_worker(&self.inner.worker);
        acknowledgement?;
        worker_result
'''
if text.count(old) != 1:
    raise SystemExit("RUST-01C shutdown acknowledgement block was not found exactly once")
path.write_text(text.replace(old, new), encoding="utf-8", newline="\n")
