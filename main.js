const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { webUtils } = require('electron');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
  return;
}

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add icon support
    // Use custom title bar
    frame: false, // Remove default frame
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff' // Set initial background color
  });

  // Handle file drops
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Prevent navigation when dropping files
    if (url.startsWith('file://')) {
      event.preventDefault();
      const filePath = decodeURIComponent(url.replace('file:///', ''));
      if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
        mainWindow.webContents.send('open-file-path', filePath);
      }
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools for debugging
  mainWindow.webContents.openDevTools();
  
  // Create the application menu
  createMenu();
};

// Create the application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click() {
            // This will be handled in renderer
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click() {
            // This will be handled in renderer
          }
        },
        { type: 'separator' },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click() {
            mainWindow.webContents.send('open-file');
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click() {
            mainWindow.webContents.send('save-file');
          }
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click() {
            mainWindow.webContents.send('save-file-as');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click() {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Theme',
          click() {
            mainWindow.webContents.send('toggle-theme');
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click() {
            require('electron').shell.openExternal('https://github.com');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  
  // Handle file opening from command line arguments or file associations
  if (process.argv.length >= 2) {
    const argv = process.argv.slice(1);
    argv.forEach((arg) => {
      if (arg.endsWith('.md') || arg.endsWith('.markdown')) {
        // Send file path to renderer when window is ready
        if (mainWindow) {
          mainWindow.webContents.once('dom-ready', () => {
            mainWindow.webContents.send('open-file-path', arg);
          });
        }
      }
    });
  }
});

// Handle file opening from file associations (Windows)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
    if (mainWindow) {
      mainWindow.webContents.send('open-file-path', filePath);
    }
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for window controls
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// IPC handlers for file operations
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const content = fs.readFileSync(result.filePaths[0], 'utf8');
      return { filePath: result.filePaths[0], content };
    } catch (err) {
      console.error('Error reading file:', err);
      return { error: 'Failed to read file' };
    }
  }
  return { canceled: true };
});

// Handle getting file path from File object
ipcMain.handle('get-file-path', async (event, filePath) => {
  try {
    // If we already have a path, return it
    if (filePath && typeof filePath === 'string' && filePath !== 'undefined') {
      return filePath;
    }
    
    // For modern Electron, we would use webUtils.getPathForFile()
    // but since we're dealing with drag and drop, the file.path should be available
    // This is a fallback for when file.path is undefined
    return null;
  } catch (error) {
    console.error('Error getting file path:', error);
    return null;
  }
});

// Handle creating temporary file for drag and drop
ipcMain.handle('create-temp-file', async (event, fileName, content) => {
  try {
    const os = require('os');
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, 'mdreader_' + Date.now() + '_' + fileName);
    
    fs.writeFileSync(tempFilePath, content, 'utf8');
    return tempFilePath;
  } catch (error) {
    console.error('Error creating temporary file:', error);
    return null;
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { content };
  } catch (err) {
    console.error('Error reading file:', err);
    return { error: 'Failed to read file' };
  }
});

ipcMain.handle('check-file-exists', async (event, filePath) => {
  try {
    const exists = fs.existsSync(filePath);
    return { exists };
  } catch (err) {
    console.error('Error checking file existence:', err);
    return { exists: false };
  }
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Error saving file:', err);
    return { error: 'Failed to save file' };
  }
});

ipcMain.handle('save-file-as', async (event, content) => {
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, content, 'utf8');
      return { filePath: result.filePath, success: true };
    } catch (err) {
      console.error('Error saving file:', err);
      return { error: 'Failed to save file' };
    }
  }
  return { canceled: true };
});

// Handle theme changes
ipcMain.handle('set-theme', async (event, theme) => {
  if (mainWindow) {
    if (theme === 'dark') {
      mainWindow.setBackgroundColor('#1e1e1e');
    } else {
      mainWindow.setBackgroundColor('#ffffff');
    }
  }
});

// Handle HTML export
ipcMain.handle('export-html', async (event, htmlContent, fileName) => {
  const result = await dialog.showSaveDialog({
    defaultPath: fileName.replace(/\.md$/, '.html'),
    filters: [
      { name: 'HTML Files', extensions: ['html'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, htmlContent, 'utf8');
      return { success: true, filePath: result.filePath };
    } catch (err) {
      console.error('Error exporting HTML:', err);
      return { error: 'Failed to export HTML' };
    }
  }
  return { canceled: true };
});