---
description: Workflow for generating automated tests
---

# Generate Test Cases

1. **Understand Requirement**: detailedly analyze the user request or the feature to be tested.
2. **Draft Plan**: Create/Update a file in `doc/test/[feature].md` using `doc/test/template.md`.
   - **Crucial**: Do not write code yet. Focus on logic and coverage.
3. **Review**: Ask the USER to review the plan (via `notify_user`).
4. **Implement**: Once approved, create `e2e/[feature].spec.ts` using Playwright.
5. **Verify**: Run `npx playwright test e2e/[feature].spec.ts`.
6. **Report**: Update `task.md` and `walkthrough.md` with results.
