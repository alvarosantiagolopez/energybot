try { Stop-Process -Name node -Force -ErrorAction SilentlyContinue }
catch { }
Start-Sleep -Seconds 1
npm run dev
