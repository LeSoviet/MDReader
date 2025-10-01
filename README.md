<img width="1202" height="804" alt="image" src="https://github.com/user-attachments/assets/534602d0-8a1f-4985-9e71-cdaa6fdac6c0" />
<img width="1200" height="796" alt="image" src="https://github.com/user-attachments/assets/44c5fee6-78c2-4792-82c2-da661e3430aa" />
<img width="1200" height="798" alt="image" src="https://github.com/user-attachments/assets/dabd3865-1ec3-4b3e-9b99-4cce7ed71858" />


# MD Reader

A modern Markdown reader with tabs support, built with Electron.

## Features

- **Tabs System**: Open multiple Markdown files in tabs
- **Real-time Preview**: See your Markdown rendered as you type
- **Syntax Highlighting**: Code blocks are syntax highlighted
- **File Associations**: Automatically opens .md files
- **Dark/Light Theme**: Toggle between themes with persistent settings
- **Drag & Drop**: Drag files directly into the application
- **Resizable Panels**: Adjust the editor and preview panel sizes
- **Ready-to-Write**: Starts with an "Untitled" tab ready for immediate writing

## Installation

### Using the Release Package (Recommended)

1. Download `dist/MDReader-1.0.0.zip`
2. Extract the ZIP file to any location on your computer
3. Run `Start MD Reader.bat` to launch the application
4. (Optional) Run `register-file-association.bat` to associate .md files with MD Reader

### Portable Version

The extracted folder is completely portable - no installation required. You can:
- Run it from a USB drive
- Copy it to any computer
- Run multiple instances

## Usage

- **Open File**: Ctrl+O or click the Open button
- **Save File**: Ctrl+S or click the Save button
- **New Tab**: Ctrl+T or click the New Tab button
- **Close Tab**: Ctrl+W
- **Toggle Theme**: Click the Theme button or use the View menu

On startup, MD Reader automatically creates an "Untitled" tab ready for you to start writing immediately.

## File Associations

To associate .md files with MD Reader:
1. Right-click on any .md file
2. Select "Open with" -> "Choose another app"
3. Browse to the location where you extracted MD Reader
4. Select MDReader.exe
5. Check "Always use this app to open .md files"
6. Click OK

Alternatively, run the `register-file-association.bat` script included in the release package.

## Development

To run the application in development mode:

```bash
npm install
npm start
```

To build the application:

```bash
npm run build
```

To create a release package:

```bash
npm run build
node package-release.js
```

### Building for Release (Windows)

To build a release version with proper signing (to avoid Windows Defender warnings):

```powershell
# Without code signing
.\build-release.ps1

# With code signing (if you have a certificate)
.\build-release.ps1 -CertificateFile "path\to\certificate.pfx" -CertificatePassword "certificate_password"
```

The release package will be created in the `dist` directory as both an installer and a ZIP file.

## Code Signing

To avoid Windows Defender warnings, it's recommended to sign your application with a code signing certificate. 
If you have a certificate file (.pfx), you can pass it to the build script as shown above.

For testing purposes, unsigned applications will work but may trigger security warnings.