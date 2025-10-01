const { ipcRenderer } = require('electron');
const marked = require('marked');
const Prism = require('prismjs');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
require('prismjs/components/prism-markdown.min.js');
require('prismjs/components/prism-javascript.min.js');
require('prismjs/components/prism-css.min.js');
require('prismjs/components/prism-python.min.js');
require('prismjs/components/prism-java.min.js');
require('prismjs/components/prism-json.min.js');
require('prismjs/components/prism-bash.min.js');

// Configure marked to better match VS Code rendering
marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: true,
  highlight: function(code, lang) {
    if (Prism.languages[lang]) {
      return Prism.highlight(code, Prism.languages[lang], lang);
    } else {
      return code;
    }
  }
});
// Tab management
let tabs = [];
let activeTabId = null;
let tabCounter = 0;

let editor;
let currentFilePath = null;
let isDarkTheme = false;
let isModified = false;
let currentFileName = 'Untitled';
let isResizing = false;
let viewMode = 'split'; // 'split', 'editor', 'preview'
let isApplyingEditorContent = false;

// Autosave configuration
let autoSaveEnabled = true;
let autoSaveInterval = 30000; // 30 seconds
let autoSaveTimer = null;
let lastSavedContent = '';
let lastSavedFilePath = null;

function resolveMonacoResourceRoot() {
  const candidates = [];

  if (process && process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'monaco-editor', 'min'));
  }

  candidates.push(path.join(__dirname, 'node_modules', 'monaco-editor', 'min'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return {
        fsPath: candidate,
        fileUrl: pathToFileURL(candidate).href
      };
    }
  }

  const fallback = candidates[candidates.length - 1];
  return {
    fsPath: fallback,
    fileUrl: pathToFileURL(fallback).href
  };
}

// Add global error handlers for debugging
window.addEventListener('error', function(e) {
  console.error('Global error caught:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled promise rejection:', e.reason);
});

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  
  // Initialize window controls
  initializeWindowControls();
  
  // Initialize tab system
  initializeTabSystem();
  
  // Initialize UI elements even if Monaco fails
  initializeUIElements();
  
  // Try to load Monaco editor
  loadMonacoEditor();
});

// Initialize custom window controls
function initializeWindowControls() {
  try {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        ipcRenderer.invoke('minimize-window');
      });
    }
    
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        ipcRenderer.invoke('maximize-window');
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        ipcRenderer.invoke('close-window');
      });
    }
  } catch (error) {
    console.error('Error initializing window controls:', error);
  }
}

// Initialize tab system
function initializeTabSystem() {
  try {
    // Create initial tab
    createNewTab();
    
    // Add event listeners for tab controls
    const newTabBtn = document.getElementById('new-tab-btn');
    const newTabBtnSmall = document.getElementById('new-tab-btn-small');
    
    if (newTabBtn) {
      newTabBtn.addEventListener('click', () => {
        createNewTab();
      });
    }
    
    if (newTabBtnSmall) {
      newTabBtnSmall.addEventListener('click', () => {
        createNewTab();
      });
    }
  } catch (error) {
    console.error('Error initializing tab system:', error);
  }
}

// Create a new tab
function createNewTab(filePath = null, content = null) {
  try {
    const tabId = `tab-${tabCounter++}`;
    const fileName = filePath ? filePath.split('\\').pop() : 'Untitled';
    
    // Create tab data
    const tabData = {
      id: tabId,
      filePath: filePath,
      fileName: fileName,
      content: content || '',
      isModified: false,
      editorInstance: null
    };
    
    // Add to tabs array
    tabs.push(tabData);
    
    // Create tab element
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.id = `tab-${tabId}`;
    tabElement.dataset.tabId = tabId;
    
    // Tab content
    tabElement.innerHTML = `
      <span class="tab-title">${fileName}</span>
      <span class="tab-close" data-tab-id="${tabId}">
        <i class="fas fa-times"></i>
      </span>
    `;
    
    // Add to tabs list
    const tabsList = document.getElementById('tabs-list');
    if (tabsList) {
      tabsList.appendChild(tabElement);
    }
    
    // Add event listeners
    tabElement.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close') || e.target.closest('.tab-close')) {
        closeTab(tabId);
      } else {
        switchToTab(tabId);
      }
    });
    
    // Middle mouse button to close tab
    tabElement.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(tabId);
      }
    });
    
    // Switch to the new tab
    switchToTab(tabId);
    
    return tabId;
  } catch (error) {
    console.error('Error creating new tab:', error);
  }
}

// Switch to a tab
function switchToTab(tabId) {
  try {
    // Update active tab
    activeTabId = tabId;
    
    // Update tab UI
    document.querySelectorAll('.tab').forEach(tab => {
      if (tab.dataset.tabId === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Find tab data
    const tabData = tabs.find(tab => tab.id === tabId);
    if (!tabData) return;
    
    // Update editor content
    if (editor) {
      isApplyingEditorContent = true;
      try {
        editor.setValue(tabData.content);
      } finally {
        isApplyingEditorContent = false;
      }
    }
    
    // Update current file info
    currentFilePath = tabData.filePath;
    currentFileName = tabData.fileName;
    isModified = tabData.isModified;
    
    // Update UI
    updateWindowTitle();
    updateStatusBar();
    updatePreview();
  } catch (error) {
    console.error('Error switching to tab:', error);
  }
}

// Close a tab
function closeTab(tabId, skipConfirmation = false) {
  try {
    // Find tab index
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;
    
    // Check for unsaved changes (only if not skipping confirmation)
    const tabData = tabs[tabIndex];
    if (!skipConfirmation && tabData.isModified && tabData.filePath) {
      // Only confirm if file has a path (not a new untitled file)
      const response = confirm(`You have unsaved changes in ${tabData.fileName}. Continue without saving?`);
      if (!response) {
        return;
      }
    }
    
    // Remove tab element
    const tabElement = document.getElementById(`tab-${tabId}`);
    if (tabElement) {
      tabElement.remove();
    }
    
    // Remove from tabs array
    tabs.splice(tabIndex, 1);
    
    // If closed tab was active, switch to another tab
    if (activeTabId === tabId) {
      if (tabs.length > 0) {
        // Switch to the next tab, or previous if it was the last one
        const newActiveIndex = tabIndex < tabs.length ? tabIndex : tabs.length - 1;
        switchToTab(tabs[newActiveIndex].id);
      } else {
        // No tabs left, create a new one
        createNewTab();
      }
    }
  } catch (error) {
    console.error('Error closing tab:', error);
  }
}

// Update active tab content
function updateActiveTabContent() {
  try {
    if (!activeTabId || !editor) return;
    
    // Find active tab
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;
    
    // Update content
    activeTab.content = editor.getValue();
    activeTab.isModified = isModified;
    
    // Update tab title if it's an untitled file
    if (!activeTab.filePath && activeTab.fileName === 'Untitled') {
      const firstLine = activeTab.content.split('\n')[0];
      if (firstLine.trim() !== '') {
        // Use first line as title (limit to 20 chars)
        const title = firstLine.trim().substring(0, 20) + (firstLine.trim().length > 20 ? '...' : '');
        activeTab.fileName = title;
        
        // Update tab UI
        const tabElement = document.querySelector(`.tab[data-tab-id="${activeTabId}"] .tab-title`);
        if (tabElement) {
          tabElement.textContent = title;
        }
      }
    }
  } catch (error) {
    console.error('Error updating active tab content:', error);
  }
}

// Load Monaco editor with better error handling
function loadMonacoEditor() {
  try {
    
    // Set up Monaco Environment before loading the editor
    const { fsPath: monacoBasePath } = resolveMonacoResourceRoot();
    const monacoVsPath = path.join(monacoBasePath, 'vs');
    const monacoVsUrl = pathToFileURL(monacoVsPath).href;

    window.MonacoEnvironment = {
      getWorkerUrl: function (workerId, label) {
        const workerMap = {
          json: 'language/json/json.worker.js',
          css: 'language/css/css.worker.js',
          scss: 'language/css/css.worker.js',
          less: 'language/css/css.worker.js',
          html: 'language/html/html.worker.js',
          handlebars: 'language/html/html.worker.js',
          razor: 'language/html/html.worker.js',
          typescript: 'language/typescript/ts.worker.js',
          javascript: 'language/typescript/ts.worker.js'
        };

        const workerRelativePath = workerMap[label] || 'editor/editor.worker.js';
        return `${monacoVsUrl}/${workerRelativePath}`;
      }
    };
    
    // Check if Monaco is already available (in case of hot reload)
    if (typeof monaco !== 'undefined' && monaco.editor) {
      initializeEditor();
      return;
    }
    
    // Dynamically load the AMD loader
    const loaderScript = document.createElement('script');
    loaderScript.src = pathToFileURL(path.join(monacoVsPath, 'loader.js')).href;
    loaderScript.onload = function() {
      try {
        // Configure require with explicit paths
        const amdRequire = globalThis.require || window.require;
        if (!amdRequire || typeof amdRequire.config !== 'function') {
          throw new Error('AMD loader did not expose require.config');
        }

        amdRequire.config({
          paths: {
            'vs': monacoVsUrl
          }
        });
        
        // Load the editor
        amdRequire(['vs/editor/editor.main'], function() {
          initializeEditor();
        }, function(error) {
          console.error('Error loading Monaco editor modules:', error);
          showEditorError('Failed to load editor modules. Please check the console for errors.');
        });
      } catch (error) {
        console.error('Error configuring require:', error);
        showEditorError('Failed to configure editor. Please check the console for errors.');
      }
    };
    
    loaderScript.onerror = function(error) {
      console.error('Error loading Monaco loader:', error);
      showEditorError('Failed to load editor resources. Please check the console for errors.');
    };
    
    document.head.appendChild(loaderScript);
  } catch (error) {
    console.error('Error in loadMonacoEditor:', error);
    showEditorError('Failed to initialize editor. Please check the console for errors.');
  }
}

// Initialize the Monaco editor
function initializeEditor() {
  try {
    const editorContainer = document.getElementById('editor');
    if (editorContainer) {
      // Clear any previous content
      editorContainer.innerHTML = '';
      
      editor = monaco.editor.create(editorContainer, {
        value: '',
        language: 'markdown',
        theme: 'vs',
        automaticLayout: true,
        minimap: {
          enabled: true
        },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on'
      });

      // Initial preview render
      updatePreview();

      // Listen for changes in the editor
      editor.onDidChangeModelContent(() => {
        if (!isApplyingEditorContent) {
          isModified = true;
          updateActiveTabContent();
          updateStatusBar();
          updatePreview();
          updateWindowTitle();
          
          // Reset autosave timer
          if (autoSaveEnabled && currentFilePath) {
            resetAutoSaveTimer();
          }
        }
      });
    } else {
      console.error('Editor container not found');
      showEditorError('Editor container not found.');
    }
  } catch (error) {
    console.error('Error initializing Monaco Editor:', error);
    showEditorError('Failed to initialize editor. Please check the console for errors.');
  }
}

// Show error message in preview pane
function showEditorError(message) {
  const preview = document.getElementById('preview');
  if (preview) {
    preview.innerHTML = `<p style="color: red;">${message}</p><p>Please try restarting the application.</p>`;
  }
}

// Initialize UI elements that don't depend on Monaco editor
function initializeUIElements() {
  try {
    
    // DOM Elements
    const openBtn = document.getElementById('open-btn');
    const saveBtn = document.getElementById('save-btn');
    const saveAsBtn = document.getElementById('save-as-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const viewModeToggle = document.getElementById('view-mode-toggle');
    const resizer = document.getElementById('resizer');
    const container = document.querySelector('.container');
    const editorPanel = document.querySelector('.editor-panel');
    const previewPanel = document.querySelector('.preview-panel');

    // Event listeners with existence checks
    if (openBtn) {
      openBtn.addEventListener('click', async () => {
        openFile();
      });
    } else {
      console.warn('Open button not found');
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveFile();
      });
    } else {
      console.warn('Save button not found');
    }

    if (saveAsBtn) {
      saveAsBtn.addEventListener('click', async () => {
        saveFileAs();
      });
    } else {
      console.warn('Save As button not found');
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        toggleTheme();
      });
    } else {
      console.warn('Theme toggle button not found');
    }
    
    if (viewModeToggle) {
      viewModeToggle.addEventListener('click', () => {
        toggleViewMode();
      });
    } else {
      console.warn('View mode toggle button not found');
    }
    
    // Resizer functionality
    if (resizer && container && editorPanel && previewPanel) {
      resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const containerRect = container.getBoundingClientRect();
        const x = e.clientX - containerRect.left;
        const containerWidth = containerRect.width;
        
        // Calculate percentage (min 20%, max 80%)
        let percentage = (x / containerWidth) * 100;
        if (percentage < 20) percentage = 20;
        if (percentage > 80) percentage = 80;
        
        editorPanel.style.width = `${percentage}%`;
        previewPanel.style.width = `${100 - percentage}%`;
      });
      
      document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      });
    } else {
      console.warn('Some UI elements for resizing not found');
    }
    
    // Initialize status bar
    updateStatusBar();
  } catch (error) {
    console.error('Error initializing UI elements:', error);
  }
}

// Update the preview pane
function updatePreview() {
  try {
    const preview = document.getElementById('preview');
    if (!preview) {
      console.warn('Preview element not found');
      return;
    }
    
    if (!editor) {
      preview.innerHTML = '<p>Editor not initialized. Please check the console for errors.</p>';
      return;
    }
    
    const content = editor.getValue();
    // Handle empty content
    if (!content || content.trim() === '') {
      preview.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No content to preview. Start typing in the editor...</p>';
      return;
    }
    
    const html = marked.parse(content);
    preview.innerHTML = html;
    
    // Highlight code blocks
    Prism.highlightAll();
  } catch (error) {
    console.error('Error updating preview:', error);
    const preview = document.getElementById('preview');
    if (preview) {
      preview.innerHTML = '<p style="color: red;">Error rendering preview. Please check the console for errors.</p>';
    }
  }
}

// Menu event handlers
try {
  ipcRenderer.on('open-file', () => {
    openFile();
  });

  ipcRenderer.on('save-file', () => {
    saveFile();
  });

  ipcRenderer.on('save-file-as', () => {
    saveFileAs();
  });

  ipcRenderer.on('toggle-theme', () => {
    toggleTheme();
  });

  ipcRenderer.on('open-file-path', (event, filePath) => {
    openFilePath(filePath);
  });
} catch (error) {
  console.error('Error setting up IPC handlers:', error);
}

async function openFile() {
  try {
    // Check for unsaved changes in active tab (only if file has content)
    if (isModified && currentFilePath && editor && editor.getValue().trim() !== '') {
      const response = confirm('You have unsaved changes. Continue without saving?');
      if (!response) {
        return;
      }
    }
    
    const result = await ipcRenderer.invoke('open-file-dialog');
    if (!result.canceled && !result.error) {
      if (editor) {
        isApplyingEditorContent = true;
        try {
          editor.setValue(result.content);
        } finally {
          isApplyingEditorContent = false;
        }
      }
      
      // Update active tab
      if (activeTabId) {
        const activeTab = tabs.find(tab => tab.id === activeTabId);
        if (activeTab) {
          activeTab.filePath = result.filePath;
          activeTab.fileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
          activeTab.content = result.content;
          activeTab.isModified = false;
          
          // Update tab title
          const tabElement = document.querySelector(`.tab[data-tab-id="${activeTabId}"] .tab-title`);
          if (tabElement) {
            tabElement.textContent = activeTab.fileName;
          }
        }
      }
      
      currentFilePath = result.filePath;
      currentFileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
      isModified = false;
      updateWindowTitle();
      updateStatusBar();
    }
  } catch (error) {
    console.error('Error opening file:', error);
    alert('Failed to open file: ' + error.message);
  }
}

async function openFilePath(filePath) {
  try {
    const normalizedPath = filePath.replace(/\\/g, '\\');
    
    const existingTab = tabs.find(tab => tab.filePath && tab.filePath.replace(/\\/g, '\\') === normalizedPath);
    if (existingTab) {
      switchToTab(existingTab.id);
      return;
    }
    
    const result = await ipcRenderer.invoke('read-file', normalizedPath);
    if (!result.error) {
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

async function saveFile(silent = false) {
  try {
    if (currentFilePath) {
      if (!editor) {
        if (!silent) alert('Editor not initialized.');
        return;
      }
      const content = editor.getValue();
      const result = await ipcRenderer.invoke('save-file', currentFilePath, content);
      if (result.error) {
        if (!silent) alert('Failed to save file: ' + result.error);
      } else {
        isModified = false;
        lastSavedContent = content;
        
        // Update active tab
        if (activeTabId) {
          const activeTab = tabs.find(tab => tab.id === activeTabId);
          if (activeTab) {
            activeTab.isModified = false;
            activeTab.content = content;
          }
        }
        
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

async function saveFileAs() {
  try {
    if (!editor) {
      alert('Editor not initialized.');
      return;
    }
    const content = editor.getValue();
    const result = await ipcRenderer.invoke('save-file-as', content);
    if (!result.canceled && !result.error) {
      currentFilePath = result.filePath;
      currentFileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
      isModified = false;
      
      // Update active tab
      if (activeTabId) {
        const activeTab = tabs.find(tab => tab.id === activeTabId);
        if (activeTab) {
          activeTab.filePath = result.filePath;
          activeTab.fileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
          activeTab.isModified = false;
          activeTab.content = content;
          
          // Update tab title
          const tabElement = document.querySelector(`.tab[data-tab-id="${activeTabId}"] .tab-title`);
          if (tabElement) {
            tabElement.textContent = activeTab.fileName;
          }
        }
      }
      
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

function toggleTheme() {
  try {
    isDarkTheme = !isDarkTheme;
    const themeIcon = document.getElementById('theme-icon');
    
    if (isDarkTheme) {
      // Apply dark theme
      document.body.classList.add('dark-theme');
      if (editor) {
        editor.updateOptions({ theme: 'vs-dark' });
      }
      // Update theme icon
      if (themeIcon) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
      }
      // Notify main process to update system title bar
      ipcRenderer.invoke('set-theme', 'dark');
    } else {
      // Apply light theme
      document.body.classList.remove('dark-theme');
      if (editor) {
        editor.updateOptions({ theme: 'vs' });
      }
      // Update theme icon
      if (themeIcon) {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
      }
      // Notify main process to update system title bar
      ipcRenderer.invoke('set-theme', 'light');
    }
    updatePreview();
    updateStatusBar();
  } catch (error) {
    console.error('Error toggling theme:', error);
  }
}

function updateWindowTitle() {
  try {
    const modifiedIndicator = isModified ? '● ' : '';
    document.title = `${modifiedIndicator}${currentFileName} - MD Reader`;
    
    // Update title bar text
    const titleBarText = document.querySelector('.title-bar-text');
    if (titleBarText) {
      titleBarText.textContent = `${modifiedIndicator}${currentFileName} - MD Reader`;
    }
  } catch (error) {
    console.error('Error updating window title:', error);
  }
}

function updateStatusBar() {
  try {
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
      let line = 1, column = 1;
      if (editor) {
        const lineColumn = editor.getPosition();
        line = lineColumn ? lineColumn.lineNumber : 1;
        column = lineColumn ? lineColumn.column : 1;
      }
      const themeText = isDarkTheme ? 'Dark' : 'Light';
      const modifiedText = isModified ? 'Modified' : 'Saved';
      const viewModeText = viewMode === 'split' ? 'Split' : viewMode === 'editor' ? 'Editor Only' : 'Preview Only';
      statusBar.textContent = `${currentFileName} - Line ${line}, Column ${column} - ${themeText} - ${modifiedText} - ${viewModeText}`;
    }
  } catch (error) {
    console.error('Error updating status bar:', error);
  }
}

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
    
    // Cycle through modes: split -> editor -> preview -> split
    if (viewMode === 'split') {
      viewMode = 'editor';
      editorPanel.style.width = '100%';
      previewPanel.style.display = 'none';
      resizer.style.display = 'none';
      if (viewModeIcon) viewModeIcon.className = 'fas fa-code';
      if (viewModeText) viewModeText.textContent = 'Editor';
    } else if (viewMode === 'editor') {
      viewMode = 'preview';
      editorPanel.style.display = 'none';
      previewPanel.style.width = '100%';
      previewPanel.style.display = 'block';
      resizer.style.display = 'none';
      if (viewModeIcon) viewModeIcon.className = 'fas fa-eye';
      if (viewModeText) viewModeText.textContent = 'Preview';
      // Update preview when switching to preview-only mode
      updatePreview();
    } else {
      viewMode = 'split';
      editorPanel.style.display = 'block';
      editorPanel.style.width = '50%';
      previewPanel.style.display = 'block';
      previewPanel.style.width = '50%';
      resizer.style.display = 'block';
      if (viewModeIcon) viewModeIcon.className = 'fas fa-columns';
      if (viewModeText) viewModeText.textContent = 'Split';
    }
    
    // Trigger editor layout update
    if (editor && viewMode !== 'preview') {
      setTimeout(() => {
        editor.layout();
      }, 100);
    }
    
    updateStatusBar();
  } catch (error) {
    console.error('Error toggling view mode:', error);
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
  try {
    // Ctrl+S for save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
    
    // Ctrl+O for open
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      openFile();
    }
    
    // Ctrl+Shift+S for save as
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      saveFileAs();
    }
    
    // Ctrl+T for new tab
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      createNewTab();
    }
    
    // Ctrl+W for close tab
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      if (activeTabId) {
        closeTab(activeTabId);
      }
    }
  } catch (error) {
    console.error('Error handling keyboard shortcuts:', error);
  }
});

// Drag and drop functionality
let dragCounter = 0;

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener('drop', async (e) => {
  try {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    document.body.style.opacity = '1';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const filePath = files[i].path;
        const extension = path.extname(filePath || '').toLowerCase();
        if (extension === '.md' || extension === '.markdown') {
          const fileStats = await fs.promises.stat(filePath);
          if (fileStats.isFile()) {
            await openFilePath(filePath);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error handling drop:', error);
  }
});

document.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter--;
  if (dragCounter === 0) {
    document.body.style.opacity = '1';
  }
});

// Autosave functionality
function resetAutoSaveTimer() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  autoSaveTimer = setTimeout(() => {
    performAutoSave();
  }, autoSaveInterval);
}

function performAutoSave() {
  if (!autoSaveEnabled || !currentFilePath || !editor) return;
  
  const currentContent = editor.getValue();
  
  // Only save if content has changed since last save
  if (currentContent !== lastSavedContent && isModified) {
    saveFile(true); // Silent save
  }
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// Before unload - removed blocking confirmation
// Autosave will handle saving, no need to block user
window.addEventListener('beforeunload', (e) => {
  // Perform final autosave if enabled
  if (autoSaveEnabled && currentFilePath && isModified) {
    performAutoSave();
  }
  
  // Stop autosave timer
  stopAutoSave();
  
  // Don't block the close - let it happen
  // Users can manually save if they want via Ctrl+S
});








