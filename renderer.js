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

let editor;
let currentFilePath = null;
let isDarkTheme = false;
let isModified = false;

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load Monaco Editor dynamically
  const loaderScript = document.createElement('script');
  loaderScript.src = './node_modules/monaco-editor/min/vs/loader.js';
  loaderScript.onload = () => {
    require.config({
      paths: {
        vs: './node_modules/monaco-editor/min/vs'
      }
    });
    
    // Set up Monaco Environment
    window.MonacoEnvironment = {
      getWorkerUrl: function (workerId, label) {
        switch (label) {
          case 'json':
            return './node_modules/monaco-editor/min/vs/language/json/json.worker.js';
          case 'css':
          case 'scss':
          case 'less':
            return './node_modules/monaco-editor/min/vs/language/css/css.worker.js';
          case 'html':
          case 'handlebars':
          case 'razor':
            return './node_modules/monaco-editor/min/vs/language/html/html.worker.js';
          case 'typescript':
          case 'javascript':
            return './node_modules/monaco-editor/min/vs/language/typescript/ts.worker.js';
          default:
            return './node_modules/monaco-editor/min/vs/editor/editor.worker.js';
        }
      }
    };
    
    require(['vs/editor/editor.main'], function () {
      // Create the editor
      editor = monaco.editor.create(document.getElementById('editor'), {
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
        updatePreview();
      });
      
      // Initialize buttons after editor is ready
      initializeButtons();
    });
  };
  document.head.appendChild(loaderScript);
});

// Update the preview pane
function updatePreview() {
  const content = editor.getValue();
  const html = marked.parse(content);
  document.getElementById('preview').innerHTML = html;
  
  // Highlight code blocks
  Prism.highlightAll();
}

// Initialize button event listeners
function initializeButtons() {
  // DOM Elements
  const openBtn = document.getElementById('open-btn');
  const saveBtn = document.getElementById('save-btn');
  const saveAsBtn = document.getElementById('save-as-btn');
  const themeToggle = document.getElementById('theme-toggle');

  // Event listeners
  openBtn.addEventListener('click', async () => {
    openFile();
  });

  saveBtn.addEventListener('click', async () => {
    saveFile();
  });

  saveAsBtn.addEventListener('click', async () => {
    saveFileAs();
  });

  themeToggle.addEventListener('click', () => {
    toggleTheme();
  });
}

// Menu event handlers
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

async function openFile() {
  // Check for unsaved changes
  if (isModified && !confirm('You have unsaved changes. Continue without saving?')) {
    return;
  }
  
  const result = await ipcRenderer.invoke('open-file-dialog');
  if (!result.canceled && !result.error) {
    editor.setValue(result.content);
    currentFilePath = result.filePath;
    document.title = `MD Reader - ${currentFilePath}`;
    isModified = false;
  }
}

async function openFilePath(filePath) {
  // Check for unsaved changes
  if (isModified && !confirm('You have unsaved changes. Continue without saving?')) {
    return;
  }
  
  const result = await ipcRenderer.invoke('read-file', filePath);
  if (!result.error) {
    editor.setValue(result.content);
    currentFilePath = filePath;
    document.title = `MD Reader - ${currentFilePath}`;
    isModified = false;
  } else {
    alert('Failed to read file: ' + result.error);
  }
}

async function saveFile() {
  if (currentFilePath) {
    const content = editor.getValue();
    const result = await ipcRenderer.invoke('save-file', currentFilePath, content);
    if (result.error) {
      alert('Failed to save file: ' + result.error);
    } else {
      isModified = false;
    }
  } else {
    saveFileAs();
  }
}

async function saveFileAs() {
  const content = editor.getValue();
  const result = await ipcRenderer.invoke('save-file-as', content);
  if (!result.canceled && !result.error) {
    currentFilePath = result.filePath;
    document.title = `MD Reader - ${currentFilePath}`;
    isModified = false;
  } else if (result.error) {
    alert('Failed to save file: ' + result.error);
  }
}

function toggleTheme() {
  isDarkTheme = !isDarkTheme;
  if (isDarkTheme) {
    // Apply dark theme
    document.body.classList.add('dark-theme');
    editor.updateOptions({ theme: 'vs-dark' });
  } else {
    // Apply light theme
    document.body.classList.remove('dark-theme');
    editor.updateOptions({ theme: 'vs' });
  }
  updatePreview();
}

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
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
});

// Drag and drop functionality
document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', async (e) => {
  e.preventDefault();
  
  // Check for unsaved changes
  if (isModified && !confirm('You have unsaved changes. Continue without saving?')) {
    return;
  }
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const filePath = files[0].path;
    if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
      openFilePath(filePath);
    }
  }
});

// Before unload warning
window.addEventListener('beforeunload', (e) => {
  if (isModified) {
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }
});