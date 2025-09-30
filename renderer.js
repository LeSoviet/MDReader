const { ipcRenderer } = require('electron');
const marked = require('marked');
const Prism = require('prismjs');
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

// Add global error handlers for debugging
window.addEventListener('error', function(e) {
  console.error('Global error caught:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled promise rejection:', e.reason);
});

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
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
      content: content || '# Welcome to MD Reader\n\nStart by opening a Markdown file or typing here...',
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
      if (e.target.classList.contains('tab-close')) {
        closeTab(tabId);
      } else {
        switchToTab(tabId);
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
      editor.setValue(tabData.content);
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
function closeTab(tabId) {
  try {
    // Find tab index
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;
    
    // Check for unsaved changes
    const tabData = tabs[tabIndex];
    if (tabData.isModified && !confirm(`You have unsaved changes in ${tabData.fileName}. Continue without saving?`)) {
      return;
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
    console.log('Loading Monaco editor');
    
    // Set up Monaco Environment before loading the editor
    window.MonacoEnvironment = {
      getWorkerUrl: function (workerId, label) {
        // Use a more robust path resolution
        const path = './node_modules/monaco-editor/min/vs/';
        switch (label) {
          case 'json':
            return path + 'language/json/json.worker.js';
          case 'css':
          case 'scss':
          case 'less':
            return path + 'language/css/css.worker.js';
          case 'html':
          case 'handlebars':
          case 'razor':
            return path + 'language/html/html.worker.js';
          case 'typescript':
          case 'javascript':
            return path + 'language/typescript/ts.worker.js';
          default:
            return path + 'editor/editor.worker.js';
        }
      }
    };
    
    // Check if Monaco is already available (in case of hot reload)
    if (typeof monaco !== 'undefined' && monaco.editor) {
      console.log('Monaco already available');
      initializeEditor();
      return;
    }
    
    // Dynamically load the AMD loader
    const loaderScript = document.createElement('script');
    loaderScript.src = './node_modules/monaco-editor/min/vs/loader.js';
    loaderScript.onload = function() {
      console.log('Monaco loader script loaded');
      try {
        // Configure require with explicit paths
        require.config({
          paths: {
            'vs': './node_modules/monaco-editor/min/vs'
          }
        });
        
        // Load the editor
        require(['vs/editor/editor.main'], function() {
          console.log('Monaco editor main loaded');
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
    console.log('Initializing Monaco editor');
    const editorContainer = document.getElementById('editor');
    if (editorContainer) {
      // Clear any previous content
      editorContainer.innerHTML = '';
      
      editor = monaco.editor.create(editorContainer, {
        value: '# Welcome to MD Reader\n\nStart by opening a Markdown file or typing here...',
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
        isModified = true;
        updateActiveTabContent();
        updateStatusBar();
        updatePreview();
        updateWindowTitle();
      });
      
      // Listen for cursor position changes
      editor.onDidChangeCursorPosition(() => {
        updateStatusBar();
      });
      
      console.log('Monaco editor initialized successfully');
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
    console.log('Initializing UI elements');
    
    // DOM Elements
    const openBtn = document.getElementById('open-btn');
    const saveBtn = document.getElementById('save-btn');
    const saveAsBtn = document.getElementById('save-as-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const resizer = document.getElementById('resizer');
    const container = document.querySelector('.container');
    const editorPanel = document.querySelector('.editor-panel');
    const previewPanel = document.querySelector('.preview-panel');

    // Event listeners with existence checks
    if (openBtn) {
      openBtn.addEventListener('click', async () => {
        console.log('Open button clicked');
        openFile();
      });
    } else {
      console.warn('Open button not found');
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        console.log('Save button clicked');
        saveFile();
      });
    } else {
      console.warn('Save button not found');
    }

    if (saveAsBtn) {
      saveAsBtn.addEventListener('click', async () => {
        console.log('Save As button clicked');
        saveFileAs();
      });
    } else {
      console.warn('Save As button not found');
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        console.log('Theme toggle clicked');
        toggleTheme();
      });
    } else {
      console.warn('Theme toggle button not found');
    }
    
    // Resizer functionality
    if (resizer && container && editorPanel && previewPanel) {
      resizer.addEventListener('mousedown', (e) => {
        console.log('Resizer mousedown');
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
        console.log('Mouse up');
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      });
    } else {
      console.warn('Some UI elements for resizing not found');
    }
    
    // Initialize status bar
    updateStatusBar();
    console.log('UI elements initialized');
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
    console.log('Open file IPC event received');
    openFile();
  });

  ipcRenderer.on('save-file', () => {
    console.log('Save file IPC event received');
    saveFile();
  });

  ipcRenderer.on('save-file-as', () => {
    console.log('Save file as IPC event received');
    saveFileAs();
  });

  ipcRenderer.on('toggle-theme', () => {
    console.log('Toggle theme IPC event received');
    toggleTheme();
  });

  ipcRenderer.on('open-file-path', (event, filePath) => {
    console.log('Open file path IPC event received:', filePath);
    openFilePath(filePath);
  });
} catch (error) {
  console.error('Error setting up IPC handlers:', error);
}

async function openFile() {
  try {
    console.log('Opening file');
    // Check for unsaved changes in active tab
    if (isModified && !confirm('You have unsaved changes. Continue without saving?')) {
      return;
    }
    
    const result = await ipcRenderer.invoke('open-file-dialog');
    if (!result.canceled && !result.error) {
      if (editor) {
        editor.setValue(result.content);
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
    console.log('Opening file by path:', filePath);
    
    // Check if file is already open in a tab
    const existingTab = tabs.find(tab => tab.filePath === filePath);
    if (existingTab) {
      switchToTab(existingTab.id);
      return;
    }
    
    // Check for unsaved changes in active tab
    if (isModified && !confirm('You have unsaved changes. Continue without saving?')) {
      return;
    }
    
    const result = await ipcRenderer.invoke('read-file', filePath);
    if (!result.error) {
      // Create new tab with file content
      createNewTab(filePath, result.content);
    } else {
      alert('Failed to read file: ' + result.error);
    }
  } catch (error) {
    console.error('Error opening file by path:', error);
    alert('Failed to open file: ' + error.message);
  }
}

async function saveFile() {
  try {
    console.log('Saving file');
    if (currentFilePath) {
      if (!editor) {
        alert('Editor not initialized.');
        return;
      }
      const content = editor.getValue();
      const result = await ipcRenderer.invoke('save-file', currentFilePath, content);
      if (result.error) {
        alert('Failed to save file: ' + result.error);
      } else {
        isModified = false;
        
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
      saveFileAs();
    }
  } catch (error) {
    console.error('Error saving file:', error);
    alert('Failed to save file: ' + error.message);
  }
}

async function saveFileAs() {
  try {
    console.log('Saving file as');
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
    console.log('Toggling theme');
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
      statusBar.textContent = `${currentFileName} - Line ${line}, Column ${column} - ${themeText} - ${modifiedText}`;
    }
  } catch (error) {
    console.error('Error updating status bar:', error);
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
  try {
    // Ctrl+S for save
    if (e.ctrlKey && e.key === 's') {
      console.log('Ctrl+S pressed');
      e.preventDefault();
      saveFile();
    }
    
    // Ctrl+O for open
    if (e.ctrlKey && e.key === 'o') {
      console.log('Ctrl+O pressed');
      e.preventDefault();
      openFile();
    }
    
    // Ctrl+Shift+S for save as
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      console.log('Ctrl+Shift+S pressed');
      e.preventDefault();
      saveFileAs();
    }
    
    // Ctrl+T for new tab
    if (e.ctrlKey && e.key === 't') {
      console.log('Ctrl+T pressed');
      e.preventDefault();
      createNewTab();
    }
    
    // Ctrl+W for close tab
    if (e.ctrlKey && e.key === 'w') {
      console.log('Ctrl+W pressed');
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
document.addEventListener('dragover', (e) => {
  console.log('Drag over event');
  e.preventDefault();
  e.stopPropagation(); // Add this to ensure proper handling
});

document.addEventListener('drop', async (e) => {
  try {
    console.log('Drop event');
    e.preventDefault();
    e.stopPropagation(); // Add this to ensure proper handling
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const filePath = files[0].path;
      console.log('Dropped file path:', filePath);
      if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
        openFilePath(filePath);
      } else {
        console.log('Dropped file is not a Markdown file');
      }
    } else {
      console.log('No files in drop event');
    }
  } catch (error) {
    console.error('Error handling drop:', error);
  }
});

// Add drag enter and drag leave events for visual feedback
document.addEventListener('dragenter', (e) => {
  console.log('Drag enter event');
  e.preventDefault();
  e.stopPropagation();
  document.body.style.opacity = '0.8';
});

document.addEventListener('dragleave', (e) => {
  console.log('Drag leave event');
  e.preventDefault();
  e.stopPropagation();
  document.body.style.opacity = '1';
});

// Before unload warning
window.addEventListener('beforeunload', (e) => {
  // Check if any tabs have unsaved changes
  const hasUnsavedTabs = tabs.some(tab => tab.isModified);
  if (hasUnsavedTabs) {
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }
});