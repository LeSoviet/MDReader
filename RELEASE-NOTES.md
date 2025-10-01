# MD Reader Release Notes

## Version 1.2.0

### New Features
- Ready-to-write "Untitled" tab on startup
- Improved tab management with better positioning of the "+" button
- Enhanced dark theme with more comfortable colors for extended reading
- Persistent theme settings that remember user preferences between sessions
- Empty application state handling with clear user guidance

### Bug Fixes
- Fixed issue where the first .md file wouldn't appear in a tab when opened
- Resolved tab close button visibility issues with long filenames
- Fixed document display issues where content wouldn't show on app startup
- Improved file opening reliability with better editor initialization timing

### Performance Improvements
- Optimized tab creation and switching performance
- Enhanced preview rendering efficiency
- Improved memory management for better application stability

## Version 1.0.0

### Features
- Tabs system for opening multiple Markdown files
- Real-time preview of Markdown content
- Syntax highlighting for code blocks
- File associations for .md and .markdown files
- Dark/light theme toggle with persistent settings
- Drag & drop support
- Resizable editor and preview panels
- Ready-to-write "Untitled" tab on startup

### Changes to Disable Dev Mode
- Removed `mainWindow.webContents.openDevTools()` call from [main.js](main.js)
- Disabled automatic opening of Developer Tools in production builds

### Windows Installer Improvements
- Switched from electron-winstaller to electron-builder for more reliable packaging
- Added proper application metadata and publisher information
- Included file associations registration
- Created both installer and portable ZIP package options
- Added scripts for easy distribution:
  - [Start MD Reader.bat](Start%20MD%20Reader.bat) - Launches the application
  - [register-file-association.bat](register-file-association.bat) - Registers .md/.markdown file associations
  - [build-release.ps1](build-release.ps1) - PowerShell script for building release packages

### Code Signing Support
- Added environment variable support for code signing certificates
- Updated build scripts to handle signing parameters
- Created [signing-setup.ps1](signing-setup.ps1) helper script for certificate setup

### Security Considerations
- Applications without code signing may trigger Windows Defender warnings
- For production distribution, obtain a code signing certificate from a trusted CA
- Self-signed certificates can be used for testing but will still show warnings

### Build Instructions
To build a release version:

```powershell
# Simple build (no signing)
.\build-release.ps1

# Build with code signing (if you have a certificate)
.\build-release.ps1 -CertificateFile "path\to\certificate.pfx" -CertificatePassword "certificate_password"
```

### Distribution Files
- `dist\MDReader-1.2.0.zip` - Portable ZIP package with all necessary files
- `dist\release\MD Reader-Setup-1.2.0.exe` - Windows installer

### Installation
1. For installer: Run `MD Reader-Setup-1.2.0.exe` and follow the installation wizard
2. For portable: Extract `MDReader-1.2.0.zip` to any location and run `Start MD Reader.bat`

### File Associations
To associate .md files with MD Reader:
1. Run `register-file-association.bat` as Administrator, OR
2. Use the installer which automatically sets up file associations