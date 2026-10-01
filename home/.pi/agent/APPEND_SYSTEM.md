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
