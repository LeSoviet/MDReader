/**
 * UI Module
 * Handles UI updates and theme management
 */

const { ipcRenderer } = require('electron');
const state = require('./state');

/**
 * Updates the window title
 */
function updateWindowTitle() {
  try {
    const modifiedIndicator = state.isModified ? '● ' : '';
    document.title = `${modifiedIndicator}${state.currentFileName} - MD Reader`;
    
    const titleBarText = document.querySelector('.title-bar-text');
    if (titleBarText) {
      titleBarText.textContent = `${modifiedIndicator}${state.currentFileName} - MD Reader`;
    }
  } catch (error) {
    console.error('Error updating window title:', error);
  }
}

/**
 * Updates the status bar
 */
function updateStatusBar() {
  try {
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
      let line = 1, column = 1;
      if (state.editor) {
        const lineColumn = state.editor.getPosition();
        line = lineColumn ? lineColumn.lineNumber : 1;
        column = lineColumn ? lineColumn.column : 1;
      }
      const themeText = state.isDarkTheme ? 'Dark' : 'Light';
      const modifiedText = state.isModified ? 'Modified' : 'Saved';
      const viewModeText = state.viewMode === 'split' ? 'Split' : state.viewMode === 'editor' ? 'Editor Only' : 'Preview Only';
      statusBar.textContent = `${state.currentFileName} - Line ${line}, Column ${column} - ${themeText} - ${modifiedText} - ${viewModeText}`;
    }
  } catch (error) {
    console.error('Error updating status bar:', error);
  }
}

/**
 * Toggles between light and dark theme
 */
function toggleTheme() {
  try {
    state.isDarkTheme = !state.isDarkTheme;
    const themeIcon = document.getElementById('theme-icon');
    
    if (state.isDarkTheme) {
      document.body.classList.add('dark-theme');
      if (state.editor) {
        state.editor.updateOptions({ theme: 'vs-dark' });
      }
      if (themeIcon) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
      }
      ipcRenderer.invoke('set-theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      if (state.editor) {
        state.editor.updateOptions({ theme: 'vs' });
      }
      if (themeIcon) {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
      }
      ipcRenderer.invoke('set-theme', 'light');
    }
    
    const { updatePreview } = require('./preview');
    updatePreview();
    updateStatusBar();
  } catch (error) {
    console.error('Error toggling theme:', error);
  }
}

/**
 * Toggles view mode between split, editor, and preview
 */
function toggleViewMode() {
  try {
    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');
    const resizer = document.getElementById('resizer');
    const viewModeIcon = document.getElementById('view-mode-icon');
    const viewModeText = document.getElementById('view-mode-text');
    
    if (!editorPanel || !previewPanel || !resizer) {
      console.error('View mode elements not found');
      return;
    }
    
    if (state.viewMode === 'split') {
      state.viewMode = 'editor';
      editorPanel.style.width = '100%';
      previewPanel.style.display = 'none';
      resizer.style.display = 'none';
      if (viewModeIcon) viewModeIcon.className = 'fas fa-code';
      if (viewModeText) viewModeText.textContent = 'Editor';
    } else if (state.viewMode === 'editor') {
      state.viewMode = 'preview';
      editorPanel.style.display = 'none';
      previewPanel.style.width = '100%';
      previewPanel.style.display = 'block';
      resizer.style.display = 'none';
      if (viewModeIcon) viewModeIcon.className = 'fas fa-eye';
      if (viewModeText) viewModeText.textContent = 'Preview';
      
      const { updatePreview } = require('./preview');
      updatePreview();
    } else {
      state.viewMode = 'split';
      editorPanel.style.display = 'block';
      editorPanel.style.width = '50%';
      previewPanel.style.display = 'block';
      previewPanel.style.width = '50%';
      resizer.style.display = 'block';
      if (viewModeIcon) viewModeIcon.className = 'fas fa-columns';
      if (viewModeText) viewModeText.textContent = 'Split';
    }
    
    if (state.editor && state.viewMode !== 'preview') {
      setTimeout(() => {
        state.editor.layout();
      }, 100);
    }
    
    updateStatusBar();
  } catch (error) {
    console.error('Error toggling view mode:', error);
  }
}

module.exports = {
  updateWindowTitle,
  updateStatusBar,
  toggleTheme,
  toggleViewMode
};
