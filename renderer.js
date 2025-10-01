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

// Recent files (Feature 3)
let recentFiles = [];

// Word count (Feature 1)
let wordCount = 0;
let charCount = 0;

// Feature 3: Load recent files from localStorage
function loadRecentFiles() {
  try {
    const stored = localStorage.getItem('recentFiles');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading recent files:', error);
    return [];
  }
}

// Feature 3: Save recent files to localStorage
function saveRecentFiles() {
  try {
    localStorage.setItem('recentFiles', JSON.stringify(recentFiles.slice(0, 10)));
  } catch (error) {
    console.error('Error saving recent files:', error);
  }
}

// Feature 3: Add file to recent files
function addToRecentFiles(filePath) {
  if (!filePath) return;
  
  // Remove if already exists
  recentFiles = recentFiles.filter(f => f !== filePath);
  // Add to beginning
  recentFiles.unshift(filePath);
  // Keep only last 10
  recentFiles = recentFiles.slice(0, 10);
  saveRecentFiles();
  updateRecentFilesMenu();
}

// Feature 3: Update recent files menu
function updateRecentFilesMenu() {
  // This will be called by main process
  ipcRenderer.send('update-recent-files', recentFiles);
}

// Feature 1: Update word and character count
function updateWordCount() {
  if (!editor) return;
  
  const content = editor.getValue();
  charCount = content.length;
  
  // Count words (split by whitespace and filter empty strings)
  const words = content.trim().split(/\s+/).filter(word => word.length > 0);
  wordCount = content.trim() === '' ? 0 : words.length;
  
  updateStatusBar();
}

// Feature 2: Export to HTML
async function exportToHTML() {
  try {
    if (!editor) {
      alert('Editor not initialized.');
      return;
    }
    
    const content = editor.getValue();
    const html = marked.parse(content);
    
    // Create full HTML document
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentFileName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Courier New', monospace;
        }
        pre {
            background-color: #f4f4f4;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
        }
        pre code {
            background: none;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #007acc;
            padding-left: 16px;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f4f4f4;
        }
    </style>
</head>
<body>
${html}
</body>
</html>`;
    
    const result = await ipcRenderer.invoke('export-html', fullHTML, currentFileName);
    if (result.error) {
      alert('Failed to export HTML: ' + result.error);
    } else if (!result.canceled) {
      alert('HTML exported successfully!');
    }
  } catch (error) {
    console.error('Error exporting to HTML:', error);
    alert('Failed to export HTML: ' + error.message);
  }
}

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

// Add function to load theme preference
function loadThemePreference() {
  try {
    const savedTheme = localStorage.getItem('mdreader-theme');
    // If no saved theme, default to dark theme
    const themeToUse = savedTheme || 'dark';
    
    if (themeToUse) {
      // Apply saved theme
      const shouldUseDarkTheme = themeToUse === 'dark';
      if (shouldUseDarkTheme !== isDarkTheme) {
        // Only toggle if different from current state
        isDarkTheme = shouldUseDarkTheme;
        const themeIcon = document.getElementById('theme-icon');
        
        if (isDarkTheme) {
          // Apply dark theme
          document.body.classList.add('dark-theme');
          if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
          }
          // Notify main process to update system title bar
          ipcRenderer.invoke('set-theme', 'dark');
        } else {
          // Apply light theme
          document.body.classList.remove('dark-theme');
          if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
          }
          // Notify main process to update system title bar
          ipcRenderer.invoke('set-theme', 'light');
        }
        
        // Update editor theme if it exists
        if (editor) {
          editor.updateOptions({ theme: isDarkTheme ? 'vs-dark' : 'vs' });
        }
      }
    }
    
    // Update UI to reflect theme
    updateStatusBar();
    updateWindowTitle();
    updatePreview();
  } catch (error) {
    console.error('Error loading theme preference:', error);
  }
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
  
  // Load recent files
  recentFiles = loadRecentFiles();
  
  // Load theme preference
  loadThemePreference();
  
  // Initialize window controls
  initializeWindowControls();
  
  // Initialize tab system (now starts empty)
  initializeTabSystem();
  
  // Initialize UI elements even if Monaco fails
  initializeUIElements();
  
  // Initialize drag and drop
  initializeDragDrop();
  
  // Try to load Monaco editor
  loadMonacoEditor();
  
  // Ensure the + button is properly positioned
  setTimeout(() => {
    const tabsControls = document.querySelector('.tabs-controls');
    const tabsWrapper = document.querySelector('.tabs-wrapper');
    if (tabsControls && tabsWrapper) {
      tabsWrapper.appendChild(tabsControls);
    }
  }, 100);
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
    // Create initial "Untitled" tab ready for writing
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
    
    // Move the new tab button to the end
    const tabsControls = document.querySelector('.tabs-controls');
    const tabsWrapper = document.querySelector('.tabs-wrapper');
    if (tabsControls && tabsWrapper) {
      tabsWrapper.appendChild(tabsControls);
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
    updateWordCount();
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
        // No tabs left, but don't create a new one automatically
        // Reset editor content to empty
        if (editor) {
          editor.setValue('');
        }
        currentFilePath = null;
        currentFileName = 'Untitled';
        isModified = false;
        
        updateWindowTitle();
        updateWordCount();
        updateStatusBar();
        updatePreview();
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
        theme: isDarkTheme ? 'vs-dark' : 'vs',
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
      editor.onDidChangeModelContent(() => {
        if (!isApplyingEditorContent) {
          isModified = true;
          updateActiveTabContent();
          updateWordCount(); // Feature 1: Update word count
          updateStatusBar();
          updatePreview();
          updateWindowTitle();
          
          // Reset autosave timer
          if (autoSaveEnabled && currentFilePath) {
            resetAutoSaveTimer();
          }
        }
      });
      
      // Update UI to reflect empty state
      updateStatusBar();
      updateWindowTitle();
      updatePreview();
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
    const exportHtmlBtn = document.getElementById('export-html-btn');
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

    if (exportHtmlBtn) {
      exportHtmlBtn.addEventListener('click', async () => {
        exportToHTML();
      });
    } else {
      console.warn('Export HTML button not found');
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
    
    // If no tabs, show empty state
    if (tabs.length === 0) {
      const textColor = isDarkTheme ? '#888' : '#666';
      preview.innerHTML = 
        '<div style="' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'height: 100%;' +
        'min-height: 200px;' +
        'color: ' + textColor + ';' +
        'font-size: 16px;' +
        'text-align: center;' +
        'padding: 40px;' +
        '">' +
        '<div>' +
        '<i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 20px;"></i>' +
        '<p style="margin: 0; font-weight: 500;">No tabs open</p>' +
        '<p style="margin: 10px 0 0 0; font-size: 14px;">Click the + button to create a new tab</p>' +
        '</div>' +
        '</div>';
      return;
    }
    
    if (!editor) {
      preview.innerHTML = '<p>Editor not initialized. Please check the console for errors.</p>';
      return;
    }
    
    const content = editor.getValue();
    // Handle empty content
    if (!content || content.trim() === '') {
      const textColor = isDarkTheme ? '#888' : '#666';
      const iconColor = isDarkTheme ? '#666' : '#999';
      preview.innerHTML = 
        '<div style="' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'height: 100%;' +
        'min-height: 200px;' +
        'color: ' + textColor + ';' +
        'font-size: 16px;' +
        'text-align: center;' +
        'padding: 40px;' +
        '">' +
        '<div>' +
        '<i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 20px; color: ' + iconColor + ';"></i>' +
        '<p style="margin: 0; font-weight: 500;">No content to preview</p>' +
        '<p style="margin: 10px 0 0 0; font-size: 14px;">Start typing in the editor...</p>' +
        '</div>' +
        '</div>';
      return;
    }
    
    const html = marked.parse(content);
    preview.innerHTML = html;
    
    Prism.highlightAll();
    
    // Add event listener for link clicks
    preview.addEventListener('click', handlePreviewLinkClick);
  } catch (error) {
    console.error('Error updating preview:', error);
    const preview = document.getElementById('preview');
    if (preview) {
      preview.innerHTML = '<p style="color: red;">Error rendering preview. Please check the console for errors.</p>';
    }
  }
}

/**
 * Handles click events on links in the preview
 */
async function handlePreviewLinkClick(event) {
  // Check if clicked element is an anchor tag
  if (event.target.tagName === 'A') {
    event.preventDefault();
    const href = event.target.getAttribute('href');
    
    // Only handle relative file paths (not external URLs)
    if (href && !/^https?:\/\//.test(href)) {
      try {
        // Resolve the file path relative to the current file
        if (currentFilePath) {
          const dir = path.dirname(currentFilePath);
          const fullPath = path.resolve(dir, href);
          
          // Check if file exists before trying to open it
          const result = await ipcRenderer.invoke('check-file-exists', fullPath);
          if (result.exists) {
            openFilePath(fullPath);
          } else {
            alert(`File not found: ${href}`);
          }
        } else {
          alert('Cannot open linked file: Current file path is unknown');
        }
      } catch (error) {
        console.error('Error opening linked file:', error);
        alert(`Failed to open linked file: ${error.message}`);
      }
    }
    // For external URLs, we could open in default browser, but for now we'll just ignore them
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
      
      // Update active tab data
      if (activeTabId) {
        const activeTab = tabs.find(tab => tab.id === activeTabId);
        if (activeTab) {
          activeTab.filePath = result.filePath;
          activeTab.fileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
          activeTab.content = result.content;
          activeTab.isModified = false;
          
          const tabElement = document.querySelector(`.tab[data-tab-id="${activeTabId}"] .tab-title`);
          if (tabElement) {
            tabElement.textContent = activeTab.fileName;
          }
        }
      }
      
      currentFilePath = result.filePath;
      currentFileName = result.filePath ? result.filePath.split('\\').pop() : 'Untitled';
      isModified = false;
      
      addToRecentFiles(result.filePath);
      
      // Refresh UI and preview explicitly because programmatic changes do not trigger content listener
      updateActiveTabContent();
      updateWordCount();
      updateStatusBar();
      updatePreview();
      updateWindowTitle();
    }
  } catch (error) {
    console.error('Error opening file:', error);
    alert('Failed to open file: ' + error.message);
  }
}

async function openFilePath(filePath) {
  try {
    console.log('openFilePath called with:', filePath);
    // Normalize the file path
    const normalizedPath = path.resolve(filePath);
    console.log('Normalized path:', normalizedPath);
    
    // Check if file is already open in a tab
    const existingTab = tabs.find(tab => tab.filePath && path.resolve(tab.filePath) === normalizedPath);
    if (existingTab) {
      console.log('File already open in tab:', existingTab.id);
      switchToTab(existingTab.id);
      return;
    }
    
    console.log('Reading file from path:', normalizedPath);
    // Read the file content
    const result = await ipcRenderer.invoke('read-file', normalizedPath);
    console.log('File read result:', result);
    
    if (!result.error) {
      // Ensure editor is initialized before creating tab
      if (!editor) {
        console.log('Editor not initialized, waiting...');
        // Wait a bit more for editor initialization
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      createNewTab(normalizedPath, result.content);
      // Add to recent files
      addToRecentFiles(normalizedPath);
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

function updateStatusBar() {
  try {
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
      // If no tabs, show empty state
      if (tabs.length === 0) {
        const themeText = isDarkTheme ? 'Dark' : 'Light';
        statusBar.textContent = `No tabs open - ${themeText} - Ready`;
        return;
      }
      
      let line = 1, column = 1;
      if (editor) {
        const lineColumn = editor.getPosition();
        line = lineColumn ? lineColumn.lineNumber : 1;
        column = lineColumn ? lineColumn.column : 1;
      }
      const themeText = isDarkTheme ? 'Dark' : 'Light';
      const modifiedText = isModified ? 'Modified' : 'Saved';
      const viewModeText = viewMode === 'split' ? 'Split' : viewMode === 'editor' ? 'Editor Only' : 'Preview Only';
      // Feature 1: Add word and character count
      statusBar.textContent = `${currentFileName} - Line ${line}, Col ${column} - Words: ${wordCount} - Chars: ${charCount} - ${themeText} - ${modifiedText} - ${viewModeText}`;
    }
  } catch (error) {
    console.error('Error updating status bar:', error);
  }
}

function updateWindowTitle() {
  try {
    // If no tabs, show empty state
    if (tabs.length === 0) {
      document.title = 'MD Reader';
      const titleBarText = document.querySelector('.title-bar-text');
      if (titleBarText) {
        titleBarText.textContent = 'MD Reader';
      }
      return;
    }
    
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

function initializeDragDrop() {
  const hasFiles = (event) => {
    const types = Array.from(event.dataTransfer?.types || []);
    const result = types.includes('Files');
    console.log('hasFiles check:', types, result);
    return result;
  };

  const showOverlay = () => {
    if (!document.body.classList.contains('drag-over')) {
      document.body.classList.add('drag-over');
    }
  };

  const hideOverlay = () => {
    dragCounter = 0;
    document.body.classList.remove('drag-over');
  };

  document.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragCounter++;
    showOverlay();
  });

  document.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  });

  document.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) {
      hideOverlay();
    }
  });

  document.addEventListener('drop', async (event) => {
    console.log('Drop event triggered', event);
    if (!hasFiles(event)) {
      console.log('No files in drop event');
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    hideOverlay();

    // For Electron, we can get file paths from dataTransfer.files
    const files = event.dataTransfer.files;
    console.log('Dropped files:', files);
    
    if (files.length === 0) {
      console.log('No files to process');
      return;
    }

    const supportedExtensions = new Set(['.md', '.markdown', '.txt']);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log('Processing file:', file);
      
      try {
        // Try to get file path - in Electron, File objects from drag/drop should have path
        let filePath = file.path;
        
        // If path is not available, try to get it via IPC
        if (!filePath || filePath === 'undefined') {
          console.log('File path not available directly, trying alternative method');
          // Use the file name and try to read it as a temporary file
          const fileContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
          });
          
          // Create a temporary file path based on the file name
          const tempPath = await ipcRenderer.invoke('create-temp-file', file.name, fileContent);
          filePath = tempPath;
        }
        
        console.log('File path:', filePath);
        
        if (!filePath) {
          console.log('Could not get file path');
          continue;
        }
        
        const extension = path.extname(filePath).toLowerCase();
        console.log('File extension:', extension);
        
        if (!supportedExtensions.has(extension)) {
          console.warn('Unsupported file dropped:', filePath);
          continue;
        }

        console.log('Opening file:', filePath);
        await openFilePath(filePath);
      } catch (error) {
        console.error('Error opening dropped file:', error);
        alert('Failed to open file: ' + error.message);
      }
    }
  });
}
