/**
 * UI Module
 * Handles UI updates and theme management
 */

const { ipcRenderer } = require('electron');
const state = require('./state');
const { updatePreview } = require('./preview');

/**
 * Updates the window title
 */
function updateWindowTitle() {
  try {
    // If no tabs, show empty state
    if (state.tabs.length === 0) {
      document.title = 'MD Reader';
      const titleBarText = document.querySelector('.title-bar-text');
      if (titleBarText) {
        titleBarText.textContent = 'MD Reader';
      }
      return;
    }
    
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
      // If no tabs, show empty state
      if (state.tabs.length === 0) {
        const themeText = state.isDarkTheme ? 'Dark' : 'Light';
        statusBar.textContent = `No tabs open - ${themeText} - Ready`;
        return;
      }
      
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
 * Initializes the Monaco editor
 */
function initializeEditor() {
  try {
    const editorContainer = document.getElementById('editor');
    if (editorContainer && !state.editor) {
      state.editor = monaco.editor.create(editorContainer, {
        value: '',
        language: 'plaintext',
        theme: state.isDarkTheme ? 'vs-dark' : 'vs',
        automaticLayout: true,
        minimap: {
          enabled: true
        },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on'
      });
      
      // Initial preview render with delays to ensure proper rendering
      setTimeout(() => {
        updatePreview();
      }, 10);
      setTimeout(() => {
        updatePreview();
      }, 100);
      setTimeout(() => {
        updatePreview();
      }, 300);

      // Listen for changes in the editor
      state.editor.onDidChangeModelContent(() => {
        if (!state.isApplyingEditorContent) {
          state.isModified = true;
          const { updateActiveTabContent } = require('./tabs');
          updateActiveTabContent();
          const { updateStatusBar } = require('./ui');
          updateStatusBar();
          updatePreview();
          const { updateWindowTitle } = require('./ui');
          updateWindowTitle();
        }
      });
    }
  } catch (error) {
    console.error('Error initializing editor:', error);
  }
}

/**
 * Toggles between light and dark theme
 */
function toggleTheme() {
  try {
    state.isDarkTheme = !state.isDarkTheme;
    const themeIcon = document.getElementById('theme-icon');
    
    // Save theme preference to localStorage
    localStorage.setItem('mdreader-theme', state.isDarkTheme ? 'dark' : 'light');
    
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
    
    updatePreview();
    updateStatusBar();
  } catch (error) {
    console.error('Error toggling theme:', error);
  }
}

// Add function to load theme preference
function loadThemePreference() {
  try {
    const savedTheme = localStorage.getItem('mdreader-theme');
    // If no saved theme, default to dark theme
    const themeToUse = savedTheme || 'dark';
    
    if (themeToUse) {
      // Apply saved theme
      const shouldUseDarkTheme = themeToUse === 'dark';
      if (shouldUseDarkTheme !== state.isDarkTheme) {
        // Only toggle if different from current state
        state.isDarkTheme = shouldUseDarkTheme;
        const themeIcon = document.getElementById('theme-icon');
        
        if (state.isDarkTheme) {
          // Apply dark theme
          document.body.classList.add('dark-theme');
          if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
          }
          ipcRenderer.invoke('set-theme', 'dark');
        } else {
          // Apply light theme
          document.body.classList.remove('dark-theme');
          if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
          }
          ipcRenderer.invoke('set-theme', 'light');
        }
        
        // Update editor theme if it exists
        if (state.editor) {
          state.editor.updateOptions({ theme: state.isDarkTheme ? 'vs-dark' : 'vs' });
        }
      }
    }
    
    // Update UI to reflect theme
    updateStatusBar();
    updateWindowTitle();
    const { updatePreview } = require('./preview');
    updatePreview();
  } catch (error) {
    console.error('Error loading theme preference:', error);
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
  toggleViewMode,
  initializeEditor,
  loadThemePreference
};
