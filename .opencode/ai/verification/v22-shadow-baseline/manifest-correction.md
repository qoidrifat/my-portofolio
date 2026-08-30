# Source Manifest Correction — v2.2.0-shadow.1

Date: 2026-08-30
Context: Protocol finalization task, Phase 1 manifest verification.

## Finding

Phase 1 recomputation of `source-manifest.json` against the worktree (identical to committed baseline `2c2bacecf9805cdd32df28ccecf59c0f41d74748`) reported one mismatch out of 42 entries:

```text
MISMATCH .gitignore
manifest = 33cc7e4aad3f239ba5faa960f654b8ab7640295b46fe27795aa5e614491293e2
actual   = 51696ea235345b23a32290514a2e8092ddad426e58e3cf0796846d73d2da38ed
```

## Root Cause

The manifest was generated during the baseline-freeze session BEFORE the final three `.gitignore` edits (audit-evidence un-ignore + runtime-state ignores) and before the baseline commit. The commit therefore contains a newer `.gitignore` than the one hashed into the manifest. This is a manifest-generation ordering error, not implementation drift: all 17 V2.2 sources, 7 tests, and 12 design contracts matched exactly, and the working tree is byte-identical to the committed baseline.

## Correction (explicit, audited — not a silent regeneration)

The single `.gitignore` entry in `integrationWiring` was updated to the hash of the file as committed in baseline `v2.2.0-shadow.1` (51696ea2…, 2048 bytes). No other entry was touched. Post-correction verification:

```text
RESULT pass=42 fail=0
```

The implementation baseline commit and tag remain unchanged; this note and the manifest correction are recorded in subsequent commits and do not alter `v2.2.0-shadow.1`.
