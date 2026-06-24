@echo off
echo ========================================
echo  資格スケジュールアプリ 起動中...
echo ========================================

echo [1/2] バックエンド起動中 (port 3001)...
start "Backend-3001" C:\Users\y-okawa\Desktop\exam-schedule-app\_start-backend.bat

echo バックエンドの起動を待機中 (10秒)...
timeout /t 10 /nobreak > nul

echo [2/2] フロントエンド起動中 (port 3000)...
start "Frontend-3000" C:\Users\y-okawa\Desktop\exam-schedule-app\_start-frontend.bat

timeout /t 4 /nobreak > nul

echo.
echo ブラウザを開きます...
start http://localhost:3000
