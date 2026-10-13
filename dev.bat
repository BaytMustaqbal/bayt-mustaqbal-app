@echo off
chcp 65001 >nul
setlocal
title Bayt Mustaqbal - Live Server

rem ============================================================
rem  Bayt Mustaqbal - jalankan live/dev server (Vite)
rem
rem  Cara pakai (klik dua kali file ini, atau dari terminal):
rem    dev.bat            server lokal + buka browser otomatis
rem    dev.bat lan        buka juga ke jaringan (akses dari HP)
rem    dev.bat noopen     jalankan tanpa membuka browser
rem
rem  Hentikan server: tekan Ctrl+C di jendela ini.
rem ============================================================

cd /d "%~dp0"

set "HOST_ARG="
set "OPEN_ARG="

:parse
if "%~1"=="" goto run
if /I "%~1"=="lan" set "HOST_ARG=--host"
if /I "%~1"=="noopen" set "OPEN_ARG=--no-open"
shift
goto parse

:run
echo.
echo  ==========================================================
echo   Bayt Mustaqbal - Live Server (Vite)
echo  ==========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [X] Node.js tidak ditemukan di PATH.
  echo      Install Node.js LTS dari https://nodejs.org, lalu buka ulang file ini.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo  [X] npm tidak ditemukan di PATH.
  echo      Tutup lalu buka ulang Command Prompt, atau install ulang Node.js.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  [*] node_modules belum ada - menjalankan "npm install" dulu.
  echo      Butuh internet, hanya sekali.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  [X] "npm install" gagal. Periksa pesan di atas.
    echo.
    pause
    exit /b 1
  )
  echo.
)

if /I "%HOST_ARG%"=="--host" (
  echo  [i] Mode LAN aktif. Alamat "Network" di bawah bisa dibuka dari HP
  echo      di jaringan yang sama.
  echo.
)

echo  [*] Menjalankan server Vite...
echo      Alamat lokal : http://localhost:3000
echo      Hentikan     : Ctrl+C
echo.

call npm run dev -- %HOST_ARG% %OPEN_ARG%

echo.
echo  [i] Server berhenti.
pause
