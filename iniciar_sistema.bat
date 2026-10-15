@echo off
chcp 65001 >nul
title Sistema de Molduras Automáticas
echo =======================================================
echo    SISTEMA DE MOLDURAS AUTOMÁTICAS (VERTICAL / HORIZONTAL)
echo =======================================================
echo.
echo Verificando dependências Python...
python -c "import flask, PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando bibliotecas necessárias (Flask e Pillow)...
    python -m pip install flask pillow
)

echo.
echo Iniciando o servidor local...
echo O seu navegador padrão abrirá automaticamente em alguns segundos.
echo.
echo Para fechar o sistema, basta fechar esta janela.
echo =======================================================
echo.

python app.py

pause
