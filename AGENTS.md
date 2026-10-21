# Working on Lampstand

## Branch policy

- `main` is the protected release branch. Do not commit directly to it, merge into it, or push changes to it unless the owner explicitly asks for that action.
- `design/responsive-redesign` is the current working and staging branch. Make and test ongoing design, content, and launch-preparation changes there. Keep this branch available after a future release merge so work can continue without using `main` as the daily working branch.
- Before editing, check the current branch and worktree status. If the checkout is on `main`, switch to the working branch or ask how to proceed if switching would disturb uncommitted work.
- A request to commit or push means commit and push the current working branch only. It does not authorize a merge to `main` or a production deployment.
- When the owner authorizes a release, review and validate the working branch, then merge or open a pull request to `main` as requested. Do not infer merge approval from content review, staging approval, or a request to publish a branch.
