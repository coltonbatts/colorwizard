---
description: Manual Verification Workflow
---

# Manual Verification Workflow

This workflow is used when code changes are complete and require manual verification by the user instead of automated browser tests.

1. Ensure the development server is running (e.g., `npm run dev`).
2. Implement requested code changes and bug fixes.
3. Run relevant unit tests using `npm test` if applicable.
4. If unit tests pass, use `notify_user` to provide a summary of changes and specific instructions for manual verification in the browser (e.g., "Go to <http://localhost:3000> and click the X button to see Y").
5. Wait for the user to provide feedback or say "ok".
6. If the user reports issues, return to step 2.
7. If the user says "ok", proceed to finalize the task (e.g., git commit).
