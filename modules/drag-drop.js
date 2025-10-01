/**
 * Drag and Drop Module
 * Handles file drag and drop functionality
 */

const path = require('path');
const fs = require('fs');
const { openFilePath } = require('./file-operations');

let dragCounter = 0;

/**
 * Initializes drag and drop handlers
 */
function initializeDragDrop() {
  const dropZone = document.body;
  
  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // Highlight drop zone when dragging over
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight(e) {
    dragCounter++;
    if (dragCounter === 1) {
      dropZone.classList.add('drag-over');
      dropZone.style.opacity = '0.7';
    }
  }
  
  function unhighlight(e) {
    dragCounter--;
    if (dragCounter === 0) {
      dropZone.classList.remove('drag-over');
      dropZone.style.opacity = '1';
    }
  }
  
  // Handle dropped files
  dropZone.addEventListener('drop', handleDrop, false);
  
  async function handleDrop(e) {
    dragCounter = 0;
    dropZone.classList.remove('drag-over');
    dropZone.style.opacity = '1';
    
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      await handleFiles(files);
    }
  }
}

/**
 * Handles dropped files
 */
async function handleFiles(files) {
  const validExtensions = ['.md', '.markdown', '.txt'];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = file.path;
    const extension = path.extname(filePath || '').toLowerCase();
    
    if (validExtensions.includes(extension)) {
      try {
        const fileStats = await fs.promises.stat(filePath);
        if (fileStats.isFile()) {
          await openFilePath(filePath);
        }
      } catch (error) {
        console.error('Error handling dropped file:', error);
        alert(`Failed to open file: ${file.name}`);
      }
    } else {
      console.warn(`Unsupported file type: ${extension}`);
    }
  }
}

module.exports = {
  initializeDragDrop
};
