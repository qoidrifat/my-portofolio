---
description: Smart Router — automatic dispatch (classify → resolve route → run opencode with the routed agent/model/variant)
---
You are `/auto`. The user's task is: $ARGUMENTS

Steps from the project root:

1. Write the full task text to `.opencode/ai/routing/last-prompt.txt` (avoids Windows command-line length limits).
2. Resolve the route deterministically:
   ```
   node .opencode/smart-router/cli.ts dispatch --prompt-file .opencode/ai/routing/last-prompt.txt
   ```
3. If the result status is `DISPATCH`, execute exactly the `dispatchCommand` from the JSON with Bash (it is an `opencode run --model ... --variant ... --agent ...` invocation of THIS task through the routed model). If the command is too long for argv, run it with the prompt text passed as a positional argument.
4. If the result status is `BLOCKED`, surface the exact warnings to the user and stop (e.g. vision tasks are blocked, never silently degraded).
5. Report the route that was used (route id, agent, model, variant, permission profile, fallbacks) and where the continuation packet was written.

Honesty constraint: this is automatic re-routing via a new dispatch — it does NOT mutate the model of an already-running conversation.
