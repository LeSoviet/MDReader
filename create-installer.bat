@echo off
echo Creating MD Reader Installer...
echo.

REM Check if NSIS is installed
where makensis >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: NSIS (makensis) not found.
    echo Please install NSIS from https://nsis.sourceforge.io/
    echo Then run this script again.
    pause
    exit /b 1
)

REM Create NSIS script
echo Creating NSIS script...
(
echo !include "MUI2.nsh"
echo.
echo ; General
echo Name "MD Reader"
echo OutFile "MDReaderSetup.exe"
echo InstallDir "$PROGRAMFILES\MDReader"
echo InstallDirRegKey HKCU "Software\MDReader" ""
echo RequestExecutionLevel admin
echo.
echo ; Interface Settings
echo !define MUI_ABORTWARNING
echo.
echo ; Pages
echo !insertmacro MUI_PAGE_WELCOME
echo !insertmacro MUI_PAGE_DIRECTORY
echo !insertmacro MUI_PAGE_INSTFILES
echo !insertmacro MUI_PAGE_FINISH
echo.
echo !insertmacro MUI_UNPAGE_WELCOME
echo !insertmacro MUI_UNPAGE_CONFIRM
echo !insertmacro MUI_UNPAGE_INSTFILES
echo !insertmacro MUI_UNPAGE_FINISH
echo.
echo ; Languages
echo !insertmacro MUI_LANGUAGE "English"
echo.
echo ; Installer Sections
echo Section "MDReader" SecMain
echo   SetOutPath "$INSTDIR"
echo.
echo   ; Add files
echo   File /r "MDReader-win32-x64\*.*"
echo.
echo   ; Create uninstaller
echo   WriteUninstaller "$INSTDIR\Uninstall.exe"
echo.
echo   ; Registry information for add/remove programs
echo   WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MDReader" "DisplayName" "MD Reader"
echo   WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MDReader" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
echo   WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MDReader" "QuietUninstallString" "$\"$INSTDIR\Uninstall.exe$\" /S"
echo   WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MDReader" "InstallLocation" "$\"$INSTDIR$\""
echo   WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MDReader" "DisplayIcon" "$\"$INSTDIR\MDReader.exe$\""
echo   WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MDReader" "Publisher" "MD Reader Team"
echo   WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MDReader" "DisplayVersion" "1.0.0"
echo.
echo   ; File association
echo   WriteRegStr HKCR ".md" "" "MDReader.MarkdownFile"
echo   WriteRegStr HKCR "MDReader.MarkdownFile" "" "Markdown Document"
echo   WriteRegStr HKCR "MDReader.MarkdownFile\DefaultIcon" "" "$INSTDIR\MDReader.exe,0"
echo   WriteRegStr HKCR "MDReader.MarkdownFile\shell\open\command" "" '$INSTDIR\MDReader.exe "$1"'
echo SectionEnd
echo.
echo ; Uninstaller Section
echo Section "Uninstall"
echo   ; Remove files
echo   RMDir /r "$INSTDIR"
echo.
echo   ; Remove registry keys
echo   DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\MDReader"
echo   DeleteRegKey HKCR "MDReader.MarkdownFile"
echo   DeleteRegKey HKCR ".md"
echo SectionEnd
) > installer.nsi

REM Compile the installer
echo Compiling installer...
makensis installer.nsi

if %errorlevel% equ 0 (
    echo.
    echo Installer created successfully: MDReaderSetup.exe
) else (
    echo.
    echo Error creating installer.
)

pause