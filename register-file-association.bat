@echo off
:: Batch file to register .md file association with MD Reader
:: Must be run as Administrator

echo Registering .md file association with MD Reader...
echo =================================================

:: Get the current directory (where this script is located)
set "APP_PATH=%~dp0MDReader.exe"

:: Check if MDReader.exe exists
if not exist "%APP_PATH%" (
    echo Error: MDReader.exe not found in the current directory.
    echo Please run this script from the same directory as MDReader.exe
    pause
    exit /b 1
)

:: Register the file association
echo Adding registry entries...

:: Create the application entry
reg add "HKEY_CLASSES_ROOT\Applications\MDReader.exe" /ve /d "MD Reader" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\Applications\MDReader.exe\shell\open\command" /ve /d "\"%APP_PATH%\" \"%%1\"" /f >nul 2>&1

:: Associate .md files with MDReader.exe
reg add "HKEY_CLASSES_ROOT\.md" /ve /d "MDFile" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\MDFile" /ve /d "Markdown Document" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\MDFile\DefaultIcon" /ve /d "\"%APP_PATH%\",0" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\MDFile\shell\open\command" /ve /d "\"%APP_PATH%\" \"%%1\"" /f >nul 2>&1

:: Associate .markdown files with MDReader.exe
reg add "HKEY_CLASSES_ROOT\.markdown" /ve /d "MarkdownFile" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\MarkdownFile" /ve /d "Markdown Document" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\MarkdownFile\DefaultIcon" /ve /d "\"%APP_PATH%\",0" /f >nul 2>&1
reg add "HKEY_CLASSES_ROOT\MarkdownFile\shell\open\command" /ve /d "\"%APP_PATH%\" \"%%1\"" /f >nul 2>&1

echo File associations registered successfully!
echo You can now open .md and .markdown files with MD Reader.

echo.
echo Note: You may need to log off and log back on for the changes to take effect in all applications.
pause