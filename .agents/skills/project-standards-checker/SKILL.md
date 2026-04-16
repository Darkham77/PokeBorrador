---
name: project-standards-checker
description: ALWAYS use this skill before presenting results to the user or when nearing the completion of a coding task. It verifies that the project passes linting rules and successfully compiles. You MUST fix any errors discovered by this skill before finalizing your response. This applies to every task that involves modifying code, even if the user didn't explicitly ask for a 'verification' or 'standards' check.
---

# Project Standards Checker

Goal: Ensure that every piece of code delivered is syntactically correct and doesn't break the build.

## When to use

- Before finishing a task and presenting the results.
- After complex refactors or changes to multiple files.
- When the user asks "is everything okay?" or "did I break anything?".
- When you are unsure if a change might have side effects on the build.

## Workflow

1. **Self-Correction**: If you have just edited code, perform a mental check for syntax errors.
2. **Execute Verification**: Run the project's official validation scripts.

   ```bash
    npm run lint ; npm run build
   ```

3. **Analyze Output**:
   - **Lint Failed**: Review the lint errors. These are usually syntax or style violations. Fix them immediately in the source files and rerun the script.
   - **Build Failed**: This means the code doesn't "compile" (e.g., missing imports, type errors, Vite build errors). Dig into the build log to find the root cause.
4. **Iterate**: Repeat steps 2 and 3 until the script reports `🎉 All checks passed!`.
5. **Report**: In your response to the user, include a brief note confirming that the project standards have been verified.

## Troubleshooting

- If `npm run lint` fails on files you didn't touch, try running it with `--fix` if the error seems minor, or report it to the user if it's pre-existing. However, aim to leave the codebase cleaner than you found it.
- If the build takes too long, check if there's a specific component or file you can target, but usually a full build is the safest verification.
