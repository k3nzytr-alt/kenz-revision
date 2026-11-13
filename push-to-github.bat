@echo off
cd /d "%~dp0"
where git 1>NUL 2>NUL || (echo Git is not installed. Get it from https://git-scm.com/download/win & pause & exit /b)
if not exist .git (
  git init -b main
  git remote add origin https://github.com/k3nzytr-alt/kenz-revision.git
)
git fetch origin main
git reset --soft origin/main
git add -A
git commit -m "Update revision site"
git push origin main
echo.
echo Done. Your site updates on GitHub Pages in a minute or two.
pause
