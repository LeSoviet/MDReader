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
    
    await electronWinstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, 'dist', 'MDReader-win32-x64'),
      outputDirectory: path.join(__dirname, 'dist', 'installer'),
      authors: 'MD Reader Team',
      exe: 'MDReader.exe',
      setupExe: 'MDReaderSetup.exe',
      noMsi: true,
      description: 'A modern Markdown reader with tabs support'
    });
    
    console.log('Windows installer created successfully!');
    console.log('Installer location: dist/installer/MDReaderSetup.exe');
  } catch (error) {
    console.error('Error creating Windows installer:', error);
  }
}

createWindowsInstaller();