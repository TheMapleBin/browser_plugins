@echo off
wsl -d Ubuntu -- docker exec -it -w /shared/hermes/claude-code/projects/chrome_plugins claude-code claude --permission-mode bypassPermissions
