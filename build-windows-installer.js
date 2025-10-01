const electronWinstaller = require('electron-winstaller');
const path = require('path');
const fs = require('fs');

async function createWindowsInstaller() {
  try {
    console.log('Creating Windows installer...');
    
    // Create assets directory if it doesn't exist
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir);
    }
    
    // Prepare installer options
    const installerOptions = {
      appDirectory: path.join(__dirname, 'dist', 'MDReader-win32-x64'),
      outputDirectory: path.join(__dirname, 'dist', 'installer'),
      authors: 'MD Reader Team',
      exe: 'MDReader.exe',
      setupExe: 'MDReaderSetup.exe',
      noMsi: true,
      description: 'A modern Markdown reader with tabs support'
    };
    
    // Add icon only if it exists
    const iconPath = path.join(__dirname, 'assets', 'icon.ico');
    if (fs.existsSync(iconPath)) {
      installerOptions.setupIcon = iconPath;
    }
    
    // Add certificate information if available
    if (process.env.WINDOWS_CERTIFICATE_FILE) {
      installerOptions.certificateFile = process.env.WINDOWS_CERTIFICATE_FILE;
    }
    
    if (process.env.WINDOWS_CERTIFICATE_PASSWORD) {
      installerOptions.certificatePassword = process.env.WINDOWS_CERTIFICATE_PASSWORD;
    }
    
    // Add signing parameters if available
    if (process.env.SIGNTOOL_PARAMS) {
      installerOptions.signWithParams = process.env.SIGNTOOL_PARAMS;
    }
    
    await electronWinstaller.createWindowsInstaller(installerOptions);
    
    console.log('Windows installer created successfully!');
    console.log('Installer location: dist/installer/MDReaderSetup.exe');
  } catch (error) {
    console.error('Error creating Windows installer:', error);
    process.exit(1);
  }
}

createWindowsInstaller();