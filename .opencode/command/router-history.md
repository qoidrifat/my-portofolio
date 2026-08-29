---
description: Smart Router — recent routing decision history
---
Run from the project root:

```
node .opencode/smart-router/cli.ts history --limit 20
```

Render each entry as one line: `timestamp | task class | agent | model#variant | permission | risk | decision | reason`. If empty, say no routing decisions have been logged yet.
