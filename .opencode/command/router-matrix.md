---
description: Smart Router — print the task→agent→model→variant→permission matrix
---
Run from the project root:

```
node .opencode/smart-router/cli.ts matrix
```

Render the output as a markdown table with columns: Task | Agent | Model | Variant | Risk | Fallback. Note under the table: variant requests are clamped to runtime-verified ceilings from the SSOT capability matrix; `vision-task` is BLOCKED by design (no verified multimodal model in this environment).
