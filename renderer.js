const { ipcRenderer } = require('electron');
const marked = require('marked');
const Prism = require('prismjs');
require('prismjs/components/prism-markdown.min.js');
require('prismjs/components/prism-javascript.min.js');
require('prismjs/components/prism-css.min.js');
require('prismjs/components/prism-python.min.js');

// Load Monaco Editor
const amdLoader = require('./node_modules/monaco-editor/min/vs/loader.js');
const req = amdLoader.require;
const MonacoEnvironment = amdLoader.MonacoEnvironment;

MonacoEnvironment.getWorkerUrl = function (workerId, label) {
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
};

let editor;
let currentFilePath = null;
let isDarkTheme = false;

req.config({
  baseUrl: './node_modules/monaco-editor/min/vs'
});

req(['vs/editor/editor.main'], function () {
  // Create the editor
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: '# Welcome to MD Reader\n\nStart by opening a Markdown file or typing here...',
    language: 'markdown',
    theme: 'vs',
    automaticLayout: true,
    minimap: {
      enabled: true
    }
  });

  // Initial preview render
  updatePreview();

  // Listen for changes in the editor
  editor.onDidChangeModelContent(() => {
    updatePreview();
  });
});

// Update the preview pane
function updatePreview() {
  const content = editor.getValue();
  const html = marked.parse(content);
  document.getElementById('preview').innerHTML = html;
  
  // Highlight code blocks
  Prism.highlightAll();
}

// DOM Elements
const openBtn = document.getElementById('open-btn');
const saveBtn = document.getElementById('save-btn');
const saveAsBtn = document.getElementById('save-as-btn');
const themeToggle = document.getElementById('theme-toggle');

// Event listeners
openBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('open-file-dialog');
  if (!result.canceled && !result.error) {
    editor.setValue(result.content);
    currentFilePath = result.filePath;
    document.title = `MD Reader - ${currentFilePath}`;
  }
});

saveBtn.addEventListener('click', async () => {
  if (currentFilePath) {
    const content = editor.getValue();
    const result = await ipcRenderer.invoke('save-file', currentFilePath, content);
    if (result.error) {
      alert('Failed to save file: ' + result.error);
    }
  } else {
    saveAsBtn.click();
  }
});

saveAsBtn.addEventListener('click', async () => {
  const content = editor.getValue();
  const result = await ipcRenderer.invoke('save-file-as', content);
  if (!result.canceled && !result.error) {
    currentFilePath = result.filePath;
    document.title = `MD Reader - ${currentFilePath}`;
  } else if (result.error) {
    alert('Failed to save file: ' + result.error);
  }
});

themeToggle.addEventListener('click', () => {
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
});

// Drag and drop functionality
document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const filePath = files[0].path;
    if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
      const result = await ipcRenderer.invoke('read-file', filePath);
      if (!result.error) {
        editor.setValue(result.content);
        currentFilePath = filePath;
        document.title = `MD Reader - ${currentFilePath}`;
      } else {
        alert('Failed to read file: ' + result.error);
      }
    }
  }
});