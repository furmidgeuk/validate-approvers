# Custom GitHub Action for PR Approval Validation

This directory contains a custom JavaScript GitHub Action that validates PR approvals based on team memberships.

## ✅ How It Works

- The action is a Node.js-based GitHub Action that uses the GitHub API to fetch PR reviews and team memberships.
- The number of required approvals per team is configurable via inputs.
- The action provides enhanced logging and error handling.

### 📂 File Structure:
```
├── .github/
│   ├── actions/
│   │   └── validate-approvers/
│   │       ├── action.yml
│   │       ├── index.js
│   │       └── package.json
│   └── workflows/
│       └── validate-approvers-custom.yml
└── custom.md
```

### ✅ Usage

To use this custom action, reference it in a workflow file:

**Example: `.github/workflows/validate-approvers-custom.yml`**

```yaml
name: Validate PR Approvers

on:
  pull_request:
    types: [submitted, edited, reopened, synchronize]

jobs:
  validate-approvers:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Validate Approvers
        uses: ./.github/actions/validate-approvers
        with:
          teams: '[{"team": "sme", "approvals": 2}, {"team": "NN-DataCore-Qualification", "approvals": 1}]'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
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
- Highly reusable across multiple repositories.
- Centralized logic for approval validation with enhanced logging.
- Scalable for more complex requirements.
