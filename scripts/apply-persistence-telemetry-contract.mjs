import { readFile, writeFile } from "node:fs/promises";

async function replaceExactlyOnce(path, oldText, newText, label) {
  const source = await readFile(path, "utf8");
  const first = source.indexOf(oldText);
  const last = source.lastIndexOf(oldText);
  if (first === -1 || first !== last) {
    throw new Error(`${label} was not found exactly once in ${path}`);
  }
  await writeFile(path, source.replace(oldText, newText), "utf8");
}

await replaceExactlyOnce(
  "apps/desktop/src-tauri/src/persistence/worker.rs",
  `    let remaining_depth = release_queue_depth(queue_depth);\n\n    performance.record_duration(\n        DesktopPerformanceEventName::PersistenceQueueWait,\n        enqueued_at.elapsed(),\n        Some(category),\n        Some(operation_id),\n        Some(depth_at_enqueue),\n    );\n    performance.measure(\n        DesktopPerformanceEventName::PersistenceDatabaseOperation,\n        Some(category),\n        Some(operation_id),\n        Some(remaining_depth),\n        || dispatch(database, command, backup_directory, mode),\n    );`,
  `    release_queue_depth(queue_depth);\n\n    performance.record_duration(\n        DesktopPerformanceEventName::PersistenceQueueWait,\n        enqueued_at.elapsed(),\n        Some(category),\n        Some(operation_id),\n        Some(depth_at_enqueue),\n    );\n    performance.measure(\n        DesktopPerformanceEventName::PersistenceDatabaseOperation,\n        Some(category),\n        Some(operation_id),\n        None,\n        || dispatch(database, command, backup_directory, mode),\n    );`,
  "persistence database queue-depth block",
);

await replaceExactlyOnce(
  "apps/desktop/src-tauri/src/persistence/performance_observability_tests.rs",
  "assert_eq!(database.queue_depth, Some(0));",
  "assert_eq!(database.queue_depth, None);",
  "single database queue-depth assertion",
);

await replaceExactlyOnce(
  "apps/desktop/src-tauri/src/persistence/performance_observability_tests.rs",
  ".all(|event| event.queue_depth == Some(0))",
  ".all(|event| event.queue_depth.is_none())",
  "sequential database queue-depth assertion",
);
