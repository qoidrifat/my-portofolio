---
description: Smart Router — show router mode, permission mode, and health
---
Run from the project root:

```
node .opencode/smart-router/cli.ts status
```

Then also show the effective permission view:

```
node .opencode/smart-router/cli.ts permissions
```

Present exactly:

```
Router Mode: <AUTO|ADVISORY|OFF>
Permission Mode: <SAFE|STANDARD|ELEVATED|YOLO>
Hard Denies: ACTIVE
Git Guard: ACTIVE
Secret Guard: ACTIVE
Registry: <N> models from verified SSOT
```

plus any open circuit breakers and the last routing decision from `.opencode/ai/routing/routing-decisions.jsonl` (tail).
