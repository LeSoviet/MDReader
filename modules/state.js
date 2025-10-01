/**
 * State Management Module
 * Manages global application state
 */

// Tab management
const state = {
  tabs: [],
  activeTabId: null,
  tabCounter: 0,
  
  // Editor state
  editor: null,
  currentFilePath: null,
  currentFileName: 'Untitled',
  isModified: false,
  isApplyingEditorContent: false,
  
  // UI state
  isDarkTheme: false,
  isResizing: false,
  viewMode: 'split', // 'split', 'editor', 'preview'
  
  // Autosave configuration
  autoSaveEnabled: true,
  autoSaveInterval: 30000, // 30 seconds
  autoSaveTimer: null,
  lastSavedContent: ''
};

module.exports = state;
