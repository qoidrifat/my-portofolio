---
description: Smart Router — route the current task (classify → agent → model → variant → permission)
---
Run the Smart Router CLI from the project root and present the decision using only routing metadata (no hidden reasoning):

```
node .opencode/smart-router/cli.ts route --prompt "$ARGUMENTS"
```

If the prompt is longer than 2000 characters, first write it to `.opencode/ai/routing/last-prompt.txt` and use `--prompt-file` instead (Windows argv limits).

Present the result as:
- TASK: matched_task_class + taskType labels
- AGENT / MODEL / VARIANT (with variantStatus)
- PERMISSION: profile + risk + hard denies active
- FALLBACK: the fallback chain
- REASON: the router's reason string
- DISPATCH: the `opencode run ...` command from `dispatchCommand` (do NOT run it unless the user asks)

If status is BLOCKED, surface the exact warning (e.g. vision tasks are blocked, never silently degraded).
