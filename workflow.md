# Reusable Workflow for PR Approval Validation

This directory contains a reusable workflow for validating PR approvals based on team memberships.

## ✅ How It Works

- The workflow checks PR reviews and counts approvals from specified teams.
- The required number of approvals per team is configurable via inputs.
- If the required number of approvals is not met, the workflow will fail.

### 📂 File Structure:
```
├── .github/
│   └── workflows/
│       └── validate-approvers-wf.yml
└── workflow.md
```

### ✅ Usage

To use this workflow in another repository, create a workflow file and reference this reusable workflow:

**Example: `.github/workflows/call-validate-approvers.yml`**

```yaml
name: Validate PR Approvers

on:
  pull_request:
    types: [submitted, edited, reopened, synchronize]

jobs:
  call-validate-approvers:
    uses: .github/workflows/validate-approvers-wf.yml
    with:
      teams: '[{"team": "sme", "approvals": 2}, {"team": "NN-DataCore-Qualification", "approvals": 1}]'
```

### ✅ Inputs
- `teams`: JSON array of teams and required approvals. Example:

```json
[
  {"team": "sme", "approvals": 2},
  {"team": "NN-DataCore-Qualification", "approvals": 1}
]
```

### ✅ Benefits
- Easy to implement and use.
- Centralized logic for approval validation.
- No need to maintain complex action code.
