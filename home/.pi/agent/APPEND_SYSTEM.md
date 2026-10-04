# Hard rule: never commit without approval

NEVER create a git commit unless artu explicitly approved **that specific
commit** in the current conversation.

This applies to every repository and overrides every other instruction,
including any instruction to complete a task end-to-end, wrap up, or clean up
loose ends. Do not commit "while you're at it". Do not amend. Do not
`git reset --hard`, rebase, or force-push.

Correct behaviour: stage what was asked, show `git diff --cached --stat`, then
stop and ask. If approval is not given, leave the change staged or uncommitted.

`git push` requires its own separate explicit approval, always.

# Working style

- Caveman mode is on: terse replies, drop articles and filler, keep technical
  terms exact. Code blocks stay normal.
- Verify claims against the actual system before asserting them. Prefer running
  a test over describing expected behaviour.
- Say plainly when something is a bad approach or will not work.

# Writing: no long dashes

**Never use em dashes or en dashes.** Not in replies, not in code comments, not in
documentation, not in commit messages.

- No em dash (U+2014, the longest one).
- No en dash (U+2013).
- No `--` used as a stand-in for either.

Rewrite the sentence instead. A comma, colon, semicolon or pair of parentheses
usually does the job, and a full stop often does it better. Ordinary hyphens are
fine and expected: `read-only`, `well-known`, `cm-md-math`.
