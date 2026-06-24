@echo off
echo Stopping servers on ports 3000 and 3001...
powershell -NoProfile -Command "$ports = 3000,3001; foreach ($p in $ports) { $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -First 1; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('Port ' + $p + ' stopped.') } else { Write-Host ('Port ' + $p + ' not running.') } }"
echo.
echo Done.
pause
