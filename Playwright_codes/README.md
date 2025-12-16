# Playwright_codes

Small Playwright example project.

Run the example script:

```powershell
cd /d d:\plawright_code\Playwright_codes
npm.cmd install
npx.cmd playwright install
node browser.js
```

Notes:
- If PowerShell blocks `npm` due to ExecutionPolicy, use `npm.cmd`/`npx.cmd` or run:
  `powershell -ExecutionPolicy Bypass -NoProfile -Command "npm install"`.
- `browser.js` currently launches your installed Chrome (`channel: 'chrome'`). Remove that option to use Playwright's bundled Chromium.

How to push to GitHub (short):

1. Install Git for Windows (see below).
2. Initialize and commit:
```powershell
git init
git add .
git commit -m "Initial commit"
```
3. Create a GitHub repo and push (use `gh` CLI or create via web UI):
```powershell
gh repo create <YOUR_USER>/<REPO_NAME> --public --source=. --remote=origin --push
# or, if created via website:
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/<REPO_NAME>.git
git push -u origin main
```
