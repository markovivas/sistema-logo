@echo off
setlocal

:: Garante que o diretorio de trabalho seja a pasta onde este script esta localizado
cd /d "%~dp0"

title Sistema de Molduras Automaticas
echo =======================================================
echo    SISTEMA DE MOLDURAS AUTOMATICAS (VERTICAL / HORIZONTAL)
echo =======================================================
echo.
echo Verificando dependencias Python...
python -c "import flask, PIL" >nul 2>&1
if errorlevel 1 (
    echo Instalando bibliotecas necessarias [Flask e Pillow]...
    python -m pip install flask pillow
)

echo.
echo Iniciando o servidor local...
echo O seu navegador padrao abrira automaticamente em alguns segundos.
echo.
echo Para fechar o sistema, basta fechar esta janela.
echo =======================================================
echo.

python app.py

pause
