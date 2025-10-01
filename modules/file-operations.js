/**
 * File Operations Module
 * Handles file opening, saving, and autosave
 */

const { ipcRenderer } = require('electron');
const state = require('./state');

/**
 * Opens a file dialog and loads the selected file
 */
async function openFile() {
  try {
    if (state.isModified && state.currentFilePath && state.editor && state.editor.getValue().trim() !== '') {
      const response = confirm('You have unsaved changes. Continue without saving?');
      if (!response) return;
    }
    
    const result = await ipcRenderer.invoke('open-file-dialog');
    if (!result.canceled && !result.error) {
      if (state.editor) {
        state.isApplyingEditorContent = true;
        try {
          state.editor.setValue(result.content);
        } finally {
          state.isApplyingEditorContent = false;
        }
      }
      
      if (state.activeTabId) {
        const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
        if (activeTab) {
          activeTab.filePath = result.filePath;
          activeTab.fileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
          activeTab.content = result.content;
          activeTab.isModified = false;
          
          const tabElement = document.querySelector(`.tab[data-tab-id="${state.activeTabId}"] .tab-title`);
          if (tabElement) tabElement.textContent = activeTab.fileName;
        }
      }
      
      state.currentFilePath = result.filePath;
      state.currentFileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
      state.isModified = false;
      
      const { updateWindowTitle, updateStatusBar } = require('./ui');
      updateWindowTitle();
      updateStatusBar();
    }
  } catch (error) {
    console.error('Error opening file:', error);
    alert('Failed to open file: ' + error.message);
  }
}

/**
 * Opens a file by path
 */
async function openFilePath(filePath) {
  try {
    const normalizedPath = filePath.replace(/\\/g, '\\');
    
    const existingTab = state.tabs.find(tab => tab.filePath && tab.filePath.replace(/\\/g, '\\') === normalizedPath);
    if (existingTab) {
      const { switchToTab } = require('./tabs');
      switchToTab(existingTab.id);
      return;
    }
    
    const result = await ipcRenderer.invoke('read-file', normalizedPath);
    if (!result.error) {
      const { createNewTab } = require('./tabs');
      createNewTab(normalizedPath, result.content);
    } else {
      console.error('Error reading file:', result.error);
      alert('Failed to read file: ' + result.error);
    }
  } catch (error) {
    console.error('Error opening file by path:', error);
    alert('Failed to open file: ' + error.message);
  }
}

/**
 * Saves the current file
 */
async function saveFile(silent = false) {
  try {
    if (state.currentFilePath) {
      if (!state.editor) {
        if (!silent) alert('Editor not initialized.');
        return;
      }
      
      const content = state.editor.getValue();
      const result = await ipcRenderer.invoke('save-file', state.currentFilePath, content);
      
      if (result.error) {
        if (!silent) alert('Failed to save file: ' + result.error);
      } else {
        state.isModified = false;
        state.lastSavedContent = content;
        
        if (state.activeTabId) {
          const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
          if (activeTab) {
            activeTab.isModified = false;
            activeTab.content = content;
          }
        }
        
        const { updateWindowTitle, updateStatusBar } = require('./ui');
        updateWindowTitle();
        updateStatusBar();
      }
    } else {
      if (!silent) saveFileAs();
    }
  } catch (error) {
    console.error('Error saving file:', error);
    if (!silent) alert('Failed to save file: ' + error.message);
  }
}

/**
 * Saves the file with a new name
 */
async function saveFileAs() {
  try {
    if (!state.editor) {
      alert('Editor not initialized.');
      return;
    }
    
    const content = state.editor.getValue();
    const result = await ipcRenderer.invoke('save-file-as', content);
    
    if (!result.canceled && !result.error) {
      state.currentFilePath = result.filePath;
      state.currentFileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
      state.isModified = false;
      
      if (state.activeTabId) {
        const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
        if (activeTab) {
          activeTab.filePath = result.filePath;
          activeTab.fileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
          activeTab.isModified = false;
          activeTab.content = content;
          
          const tabElement = document.querySelector(`.tab[data-tab-id="${state.activeTabId}"] .tab-title`);
          if (tabElement) tabElement.textContent = activeTab.fileName;
        }
      }
      
      const { updateWindowTitle, updateStatusBar } = require('./ui');
      updateWindowTitle();
      updateStatusBar();
    } else if (result.error) {
      alert('Failed to save file: ' + result.error);
    }
  } catch (error) {
    console.error('Error saving file as:', error);
    alert('Failed to save file: ' + error.message);
  }
}

/**
 * Resets the autosave timer
 */
function resetAutoSaveTimer() {
  if (state.autoSaveTimer) {
    clearTimeout(state.autoSaveTimer);
  }
  
  state.autoSaveTimer = setTimeout(() => {
    performAutoSave();
  }, state.autoSaveInterval);
}

/**
 * Performs autosave
 */
function performAutoSave() {
  if (!state.autoSaveEnabled || !state.currentFilePath || !state.editor) return;
  
  const currentContent = state.editor.getValue();
  if (currentContent !== state.lastSavedContent && state.isModified) {
    saveFile(true);
  }
}

/**
 * Stops autosave
 */
function stopAutoSave() {
  if (state.autoSaveTimer) {
    clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = null;
  }
}

module.exports = {
  openFile,
  openFilePath,
  saveFile,
  saveFileAs,
  resetAutoSaveTimer,
  performAutoSave,
  stopAutoSave
};
