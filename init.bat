
@echo off
set "src=D:\coding\projects\minecraft-dev\project\mcbe-dev"
set "dst=D:\coding\projects\minecraft-dev\project\%1"
if "%~1"=="" (
    echo Please provide the target path as the first argument
    exit /b 1
)
robocopy "%src%" "%dst%" /E /XD node_modules .git dist .vscode .idea .cache
cd /d "%dst%"
git init
git add .
git commit -m "init"
call npm ci
call npm run tools:setup -- "%1"
