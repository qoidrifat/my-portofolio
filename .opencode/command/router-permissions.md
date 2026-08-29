---
description: Smart Router — view or change the permission mode (safe|standard|elevated|yolo)
---
Run from the project root.

Without an argument — show the current permission state:

```
node .opencode/smart-router/cli.ts permissions
```

With an argument (`safe`, `standard`, `elevated`, or `yolo`):

```
node .opencode/smart-router/cli.ts set-permissions --value <value>
```

Always state after any change:

```
Hard Denies: ACTIVE
Git Guard: ACTIVE
Secret Guard: ACTIVE
```

YOLO reduces prompts but NEVER bypasses hard denies: `git reset --hard`, force push, `git clean -f`, history rewrite, destructive cloud/filesystem actions, and secret/credential access remain DENY (enforced via the plugin's `permission.ask` and `tool.execute.before` guards).
