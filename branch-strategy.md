# Branch Strategy and PR Approval Process

Our repository uses a two-stage PR approval process to ensure proper review by both SME and Quality teams.

## Workflow Overview

```
Feature Branch → SME-Approval Branch → Main Branch
      │                │                 │
      ▼                ▼                 ▼
  Development    SME Approval      Quality Approval
                (2 approvals)     (1 approval)
```

## Process for Developers

### 1. Feature Development

- Create your feature branch from `main` or `SME-Approval`
- Complete your development work
- Test thoroughly on your branch

### 2. SME Review Stage

- Create a PR from your feature branch targeting the `SME-Approval` branch
- The PR will automatically request reviews from SME team members
- Address any feedback and make required changes
- Your PR requires 2 approvals from SME team members
- Once approved, merge your PR to the `SME-Approval` branch

### 3. Quality Review Stage

- A PR from `SME-Approval` to `main` will be automatically created
- The Quality team will be assigned as reviewers
- Quality team reviews and approves the PR
- Once approved by Quality, the PR can be merged to `main`

## Important Notes

- Do NOT create PRs directly from feature branches to `main`
- Always target your feature PRs to the `SME-Approval` branch
- Wait for SME approval before expecting Quality review
- The Quality team should only review PRs from `SME-Approval` to `main`

## Special Cases

For emergency hotfixes that need to bypass this process, please contact a repository administrator.
