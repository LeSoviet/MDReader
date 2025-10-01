/**
 * MDReader - Main Renderer Process
 * Modular and optimized version
 */

const { ipcRenderer } = require('electron');
const marked = require('marked');
const Prism = require('prismjs');
const path = require('path');
const { pathToFileURL } = require('url');

// Load Prism language components
require('prismjs/components/prism-markdown.min.js');
require('prismjs/components/prism-javascript.min.js');
require('prismjs/components/prism-css.min.js');
require('prismjs/components/prism-python.min.js');
require('prismjs/components/prism-java.min.js');
require('prismjs/components/prism-json.min.js');
require('prismjs/components/prism-bash.min.js');

// Import modules
const state = require('./modules/state');
const { createNewTab, switchToTab, closeTab, updateActiveTabContent } = require('./modules/tabs');
const { openFile, openFilePath, saveFile, saveFileAs, resetAutoSaveTimer, performAutoSave, stopAutoSave } = require('./modules/file-operations');
const { updatePreview } = require('./modules/preview');
const { updateWindowTitle, updateStatusBar, toggleTheme, toggleViewMode } = require('./modules/ui');
const { initializeDragDrop } = require('./modules/drag-drop');

// Configure marked for better rendering
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
    }
    return code;
  }
});

// Global error handlers
window.addEventListener('error', (e) => {
  console.error('Global error caught:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeWindowControls();
  initializeTabSystem();
  initializeUIElements();
  initializeDragDrop();
  loadMonacoEditor();
});

/**
 * Initialize custom window controls
 */
function initializeWindowControls() {
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');
  const closeBtn = document.getElementById('close-btn');
  
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => ipcRenderer.invoke('minimize-window'));
  }
  
  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => ipcRenderer.invoke('maximize-window'));
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => ipcRenderer.invoke('close-window'));
  }
}

/**
 * Initialize tab system
 */
function initializeTabSystem() {
  createNewTab();
  
  const newTabBtn = document.getElementById('new-tab-btn');
  const newTabBtnSmall = document.getElementById('new-tab-btn-small');
  
  if (newTabBtn) {
    newTabBtn.addEventListener('click', () => createNewTab());
  }
  
  if (newTabBtnSmall) {
    newTabBtnSmall.addEventListener('click', () => createNewTab());
  }
}

/**
 * Initialize UI elements
 */
function initializeUIElements() {
  const openBtn = document.getElementById('open-btn');
  const saveBtn = document.getElementById('save-btn');
  const saveAsBtn = document.getElementById('save-as-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const viewModeToggle = document.getElementById('view-mode-toggle');
  const resizer = document.getElementById('resizer');
  const container = document.querySelector('.container');
  const editorPanel = document.querySelector('.editor-panel');
  const previewPanel = document.querySelector('.preview-panel');

  if (openBtn) openBtn.addEventListener('click', openFile);
  if (saveBtn) saveBtn.addEventListener('click', saveFile);
  if (saveAsBtn) saveAsBtn.addEventListener('click', saveFileAs);
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  if (viewModeToggle) viewModeToggle.addEventListener('click', toggleViewMode);
  
  // Resizer functionality
  if (resizer && container && editorPanel && previewPanel) {
    resizer.addEventListener('mousedown', (e) => {
      state.isResizing = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!state.isResizing) return;
      
      const containerRect = container.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      const containerWidth = containerRect.width;
      
      let percentage = (x / containerWidth) * 100;
      if (percentage < 20) percentage = 20;
      if (percentage > 80) percentage = 80;
      
      editorPanel.style.width = `${percentage}%`;
      previewPanel.style.width = `${100 - percentage}%`;
    });
    
    document.addEventListener('mouseup', () => {
      state.isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }
  
  updateStatusBar();
}

/**
 * Resolve Monaco editor resource root
 */
function resolveMonacoResourceRoot() {
  const fs = require('fs');
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

/**
 * Load Monaco editor
 */
function loadMonacoEditor() {
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
  
  if (typeof monaco !== 'undefined' && monaco.editor) {
    initializeEditor();
    return;
  }
  
  const loaderScript = document.createElement('script');
  loaderScript.src = pathToFileURL(path.join(monacoVsPath, 'loader.js')).href;
  loaderScript.onload = function() {
    const amdRequire = globalThis.require || window.require;
    if (!amdRequire || typeof amdRequire.config !== 'function') {
      throw new Error('AMD loader did not expose require.config');
    }

    amdRequire.config({
      paths: { 'vs': monacoVsUrl }
    });
    
    amdRequire(['vs/editor/editor.main'], initializeEditor, (error) => {
      console.error('Error loading Monaco editor modules:', error);
    });
  };
  
  loaderScript.onerror = (error) => {
    console.error('Error loading Monaco loader:', error);
  };
  
  document.head.appendChild(loaderScript);
}

/**
 * Initialize Monaco editor
 */
function initializeEditor() {
  const editorContainer = document.getElementById('editor');
  if (!editorContainer) {
    console.error('Editor container not found');
    return;
  }
  
  editorContainer.innerHTML = '';
  
  state.editor = monaco.editor.create(editorContainer, {
    value: '',
    language: 'markdown',
    theme: 'vs',
    automaticLayout: true,
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on'
  });

  updatePreview();

  state.editor.onDidChangeModelContent(() => {
    if (!state.isApplyingEditorContent) {
      state.isModified = true;
      updateActiveTabContent();
      updateStatusBar();
      updatePreview();
      updateWindowTitle();
      
      if (state.autoSaveEnabled && state.currentFilePath) {
        resetAutoSaveTimer();
      }
    }
  });
  
  state.editor.onDidChangeCursorPosition(() => {
    updateStatusBar();
  });
}

// IPC event handlers
ipcRenderer.on('open-file', openFile);
ipcRenderer.on('save-file', saveFile);
ipcRenderer.on('save-file-as', saveFileAs);
ipcRenderer.on('toggle-theme', toggleTheme);
ipcRenderer.on('open-file-path', (event, filePath) => openFilePath(filePath));

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveFile();
  }
  
  if (e.ctrlKey && e.key === 'o') {
    e.preventDefault();
    openFile();
  }
  
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    saveFileAs();
  }
  
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    createNewTab();
  }
  
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (state.activeTabId) {
      closeTab(state.activeTabId);
    }
  }
});

// Before unload handler
window.addEventListener('beforeunload', (e) => {
  if (state.autoSaveEnabled && state.currentFilePath && state.isModified) {
    performAutoSave();
  }
  
  stopAutoSave();
});
