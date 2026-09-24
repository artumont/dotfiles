---
name: pr-draft
description: Guides an agent through drafting a high-quality pull request using the GitHub CLI (gh). Covers prerequisites, pre-PR checks, title conventions, description structure, command flags, best practices, and a complete example workflow.
version: 1.0.0
author: pi-agent
tags:
  - git
  - github
  - cli
  - pull-request
  - collaboration
---

# Skill: Drafting a High-Quality Pull Request with `gh` CLI

## 1. Overview & Purpose

This skill enables the agent to guide a user through creating a well-structured, reviewable pull request (PR) using the GitHub CLI (`gh`). The goal is to ensure that every PR has a clear title, a comprehensive description, and the correct metadata so that reviewers can understand the change quickly and provide effective feedback.

**Trigger Keywords:** create PR, pull request, gh pr create, submit for review, open a pull request, draft PR.

## 2. Prerequisites

Before attempting to create a PR, the agent must verify the following:

- **Authentication:** The `gh` CLI must be authenticated. Run `gh auth status` to confirm. If not authenticated, instruct the user to run `gh auth login`.
- **Branch State:** The current branch must be pushed to the remote. Use `git push -u origin HEAD` to set the upstream branch.
- **Not on `main`:** Never create a PR directly from the `main` branch. Check with `git branch --show-current`.

## 3. Pre-PR Checklist (Local Verification)

Before creating the PR, the agent should help the user run these checks:

| Check | Command | Purpose |
|-------|---------|---------|
| **Uncommitted changes** | `git status` | Ensure all work is committed. |
| **Branch up-to-date** | `git fetch origin && git rebase origin/main` | Avoid merge conflicts. |
| **Commit hygiene** | `git log origin/main..HEAD --oneline` | Review commits; consider squashing related commits for a cleaner history. |
| **Diff review** | `git diff origin/main...HEAD` | Confirm only intended changes are included. |
| **Tests & Linting** | Run project’s test/lint commands (e.g., `npm test`, `pytest`) | Ensure CI will pass. |

## 4. PR Title Format

A good PR title is concise (under 70 characters) and follows the **Conventional Commits** specification. This is critical because many repositories use the PR title as the squash‑merge commit message, and semantic‑release tools rely on it.

**Format:** `<type>(<scope>): <description>`

**Common Types:**
- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation only
- `refactor` – Code change that neither fixes a bug nor adds a feature
- `test` – Adding or updating tests
- `chore` – Maintenance tasks (CI, build, dependencies)

**Examples:**
- `feat(evaluator): add support for custom rubrics`
- `fix(jobs): handle timeout errors gracefully`
- `docs(sdk): update authentication examples`

## 5. PR Description Structure

A well‑written description answers three key questions for the reviewer: **What changed? Why? How?** Research shows clear descriptions can reduce review time by up to 40%.

**Recommended Template (Markdown):**

```markdown
## Summary
<!-- 1-3 sentences: what this PR does and why -->

## Related Issue
<!-- Fixes #NNN or Closes #NNN -->

## Changes
<!-- Bullet list of key changes -->
- 
- 

## Testing
<!-- What testing was done? -->
- [ ] `npm test` passes
- [ ] Manual verification with example data
- [ ] Edge cases covered

## Screenshots (if applicable)
<!-- Add before/after screenshots for UI changes -->

## Notes for Reviewers
<!-- Any specific areas to focus on, tradeoffs, or open questions -->
