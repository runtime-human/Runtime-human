## Scope

Describe one independently reviewable change and the concrete player/developer problem it solves.

- Related issue:
- Intended squash title: `<type>(<scope>): <summary>`

## Architecture and contracts

- Relevant ADR/specification:
- New/changed public or internal contracts:
- Save/content/ruleset/persistence impact:
- Player/user impact:

## Verification

Record only checks actually run on the current change. Mark important checks that were not run.

```text
command → result
```

- Not run / intentionally deferred:

## Risk and recovery

- Main failure modes:
- Migration/rollback/recovery:
- Security/capability implications:

## Review contract

Use `blocking:`, `suggestion:`, `question:` and `nit:` prefixes for actionable review comments. All blocking threads must be resolved before merge.

## Human review required

Mark changes to workflows/GitHub governance, Tauri capabilities, persistence/migrations, updater/signing, canonical historical dates, licenses and destructive content IDs.

## Public evidence checklist

- [ ] PR title is the intended durable squash commit message.
- [ ] Documentation/contracts/tests were synchronized where required.
- [ ] Verification claims match checks actually run.
- [ ] Public logs, screenshots and pasted evidence contain no secrets, usernames, runner hostnames, private data or local absolute home paths.
- [ ] No test, guard or security boundary was weakened only to make a check pass.
- [ ] All `blocking:` review threads are resolved on the current head before merge.
