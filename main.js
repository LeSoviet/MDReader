const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const fs = require('fs');
const path = require('path');

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
    // Use custom title bar for better theme control
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#f3f3f3',
      symbolColor: '#000000'
    },
    backgroundColor: '#ffffff' // Set initial background color
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools for debugging
  // mainWindow.webContents.openDevTools();
  
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
app.on('ready', createWindow);

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

// Handle file opening from command line arguments or file associations
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('open-file-path', filePath);
  }
});

// IPC handlers
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

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { content };
  } catch (err) {
    console.error('Error reading file:', err);
    return { error: 'Failed to read file' };
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

// Handle theme changes for system title bar
ipcMain.handle('set-theme', async (event, theme) => {
  if (mainWindow) {
    if (theme === 'dark') {
      mainWindow.setTitleBarOverlay({
        color: '#2d2d2d',
        symbolColor: '#ffffff'
      });
      mainWindow.setBackgroundColor('#1e1e1e');
    } else {
      mainWindow.setTitleBarOverlay({
        color: '#f3f3f3',
        symbolColor: '#000000'
      });
      mainWindow.setBackgroundColor('#ffffff');
    }
  }
});