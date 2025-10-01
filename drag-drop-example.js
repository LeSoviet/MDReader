/**
 * Complete example of drag and drop handling in Electron
 * This demonstrates the proper way to access file paths in Electron
 */

// In renderer process (renderer.js or included script)
document.addEventListener("drop", async (event) => {
  // Prevent default behavior
  event.preventDefault();
  event.stopPropagation();
  
  // Access files directly from dataTransfer - this preserves the path property
  const files = event.dataTransfer.files;
  
  console.log(`Dropped ${files.length} files:`);
  
  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    console.log("File name:", file.name);
    console.log("File size:", file.size);
    console.log("File type:", file.type);
    
    // In Electron, File objects have a path property with the full file path
    // This only works if accessed directly from event.dataTransfer.files
    console.log("File path:", file.path);
    
    // Check if it's a markdown file
    if (file.path && (file.path.endsWith('.md') || file.path.endsWith('.markdown'))) {
      try {
        // Read the file content using Node.js fs module via IPC
        // (Never use fs directly in renderer - use IPC instead)
        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('read-file', file.path);
        
        if (!result.error) {
          console.log('File content:', result.content);
          
          // Process the markdown content
          processMarkdownContent(file.path, result.content);
        } else {
          console.error('Error reading file:', result.error);
        }
      } catch (error) {
        console.error('Error processing file:', error);
      }
    } else {
      console.log('Not a markdown file, skipping');
    }
  }
});

// Helper function to process markdown content
function processMarkdownContent(filePath, content) {
  console.log(`Processing markdown file: ${filePath}`);
  console.log(`Content preview: ${content.substring(0, 100)}...`);
  
  // Here you would typically update your UI with the file content
  // For example, updating an editor or preview pane
}

// Also need to handle dragover and dragenter events to allow drop
document.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.stopPropagation();
});

document.addEventListener("dragenter", (event) => {
  event.preventDefault();
  event.stopPropagation();
});

/**
 * In main process (main.js), you need to set up proper webPreferences:
 * 
 * const { app, BrowserWindow } = require('electron');
 * 
 * const createWindow = () => {
 *   const mainWindow = new BrowserWindow({
 *     width: 1200,
 *     height: 800,
 *     webPreferences: {
 *       nodeIntegration: true,     // Required for IPC
 *       contextIsolation: false    // Required to access file.path in renderer
 *     }
 *   });
 * 
 *   mainWindow.loadFile('index.html');
 * };
 * 
 * app.whenReady().then(createWindow);
 */

/**
 * Also in main process, handle the IPC call:
 * 
 * const { ipcMain } = require('electron');
 * const fs = require('fs');
 * 
 * ipcMain.handle('read-file', async (event, filePath) => {
 *   try {
 *     const content = fs.readFileSync(filePath, 'utf8');
 *     return { content };
 *   } catch (err) {
 *     console.error('Error reading file:', err);
 *     return { error: 'Failed to read file' };
 *   }
 * });
 */