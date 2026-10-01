@echo off
title Lanzador Automatico TUI-A
chcp 65001 >nul

echo ======================================================================
echo    PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
echo ======================================================================
echo.
echo [1/3] Iniciando Servidor Backend (Python + OpenCV + WebSockets)...
start "TUI-A Backend (Python)" cmd /k "cd /d "%~dp0" && .\venv\Scripts\activate.bat && python backend\app.py"

echo [2/3] Iniciando Servidor Frontend (React + Tailwind)...
start "TUI-A Frontend (React)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [3/3] Esperando 3 segundos a que los servidores esten listos...
timeout /t 3 /nobreak >nul

echo Abriendo la aplicacion en tu navegador web...
start http://localhost:5173

echo.
echo ======================================================================
echo  SISTEMA CORRIENDO CORRECTAMENTE
echo  - Puedes cerrar esta ventana.
echo  - Para detener el programa por completo, cierra las dos ventanas
echo    negras que se abrieron (Backend y Frontend).
echo ======================================================================
pause
