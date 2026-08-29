---
description: Smart Router — explain the routing decision for a prompt (metadata only)
---
Run from the project root with the user's prompt:

```
node .opencode/smart-router/cli.ts route --prompt "$ARGUMENTS"
```

Present ONLY routing metadata in this exact shape (never reveal chain-of-thought):

```
TASK: <matched_task_class>
AGENT: <agent>
MODEL: <model>
VARIANT: <variant>
PERMISSION: <profile>/<risk>
FALLBACK: <fallback chain, comma separated>
REASON: <reason string>
WARNINGS: <warnings if any>
```
