# Luna Chat Coder workbench entry point

When repository development is requested from a chat surface with a disposable or sandboxed code-execution environment, read `.agents/skills/luna-chat-coder/SKILL.md` before working on the repository task.

This repository is a reusable chat coding workbench. If the user names another GitHub repository, PR, branch, or commit as the target, treat that named repository as the actual development target. Load Luna from this workbench first, then inspect and follow the target repository's own `AGENTS.md`, `CONTRIBUTING.md`, README, build declarations, and engineering instructions. Target-repository instructions take precedence for project-specific engineering decisions.

Do not modify this workbench merely because another repository is being worked on. Only change this repository when the user explicitly asks to change the workbench itself.

Loading Luna is a readiness step, not a reason to use GitHub Actions. Normal engineering work should stay in the chat sandbox work container when it is available and sufficient. Use Actions only for a real capability, transport, or execution gap as defined by the Luna skill.

For any target repository, resolve exact GitHub branch/PR state to an immutable commit identity before substantial edits, materialize exact source into the sandbox when repository-wide editing/build/test work is required, preserve unrelated work, and verify changes using the target repository's declared tooling.

Treat GitHub commit and PR state as durable source truth. Do not make access to the user's computer a dependency of ordinary repository development.

Before publishing changes, respect the user's requested publication scope and preserve unrelated changes. Report only checks and writes that actually occurred.
