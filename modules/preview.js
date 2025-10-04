/**
 * Preview Module
 * Handles markdown preview rendering
 */

const marked = require('marked');
const Prism = require('prismjs');
const state = require('./state');
const path = require('path');
const { openFilePath } = require('./file-operations');

// Configure marked to generate header IDs automatically
marked.setOptions({
  headerIds: true,
  headerPrefix: '',
  gfm: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
});

// Custom renderer to ensure headers have proper IDs
const renderer = new marked.Renderer();
renderer.heading = function(text, level) {
  // Generate ID from text content
  const id = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  return `<h${level} id="${id}">${text}</h${level}>`;
};

marked.setOptions({ renderer });

/**
 * Updates the preview pane with rendered markdown
 */
function updatePreview() {
  try {
    const preview = document.getElementById('preview');
    if (!preview) {
      console.warn('Preview element not found');
      return;
    }
    
    // If no tabs, show empty state
    if (state.tabs.length === 0) {
      const textColor = state.isDarkTheme ? '#888' : '#666';
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
    
    if (!state.editor) {
      preview.innerHTML = '<p>Editor not initialized. Please check the console for errors.</p>';
      return;
    }
    
    const content = state.editor.getValue();
    
    if (!content || content.trim() === '') {
      const textColor = state.isDarkTheme ? '#888' : '#666';
      const iconColor = state.isDarkTheme ? '#666' : '#999';
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
    
    // Remove any existing event listeners and add new one
    preview.removeEventListener('click', handlePreviewLinkClick);
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
function handlePreviewLinkClick(event) {
  // Check if clicked element is an anchor tag
  if (event.target.tagName === 'A') {
    event.preventDefault();
    const href = event.target.getAttribute('href');
    
    if (!href) return;
    
    // Handle internal anchor links (sublinks)
    if (href.startsWith('#')) {
      handleInternalAnchorLink(href);
      return;
    }
    
    // Handle external URLs
    if (/^https?:\/\//.test(href)) {
      // Open external URLs in default browser
      const { shell } = require('electron');
      shell.openExternal(href);
      return;
    }
    
    // Handle relative file paths
    try {
      // Resolve the file path relative to the current file
      if (state.currentFilePath) {
        const dir = path.dirname(state.currentFilePath);
        const fullPath = path.resolve(dir, href);
        
        // Check if file exists before trying to open it
        const fs = require('fs');
        if (fs.existsSync(fullPath)) {
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
}

/**
 * Handles internal anchor links (sublinks) navigation
 */
function handleInternalAnchorLink(href) {
  try {
    console.log('Navigating to anchor:', href); // Debug log
    const preview = document.getElementById('preview');
    if (!preview) {
      console.error('Preview element not found');
      return;
    }
    
    // Remove the # from href to get the anchor id
    const anchorId = href.substring(1);
    console.log('Looking for anchor ID:', anchorId); // Debug log
    
    // First try to find element with exact id
    let targetElement = preview.querySelector(`#${CSS.escape(anchorId)}`);
    console.log('Found by exact ID:', targetElement); // Debug log
    
    // If not found, try to find by generated header id
    if (!targetElement) {
      // Convert anchor to the format that marked.js generates for headers
      // Headers are converted to lowercase with spaces/special chars replaced by hyphens
      const generatedId = anchorId
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
      
      console.log('Generated ID:', generatedId); // Debug log
      targetElement = preview.querySelector(`#${CSS.escape(generatedId)}`);
      console.log('Found by generated ID:', targetElement); // Debug log
    }
    
    // If still not found, try to find by text content in headers
    if (!targetElement) {
      const headers = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
      console.log('Available headers:', Array.from(headers).map(h => ({ text: h.textContent, id: h.id }))); // Debug log
      
      const decodedAnchor = decodeURIComponent(anchorId).toLowerCase();
      
      for (const header of headers) {
        const headerText = header.textContent.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        if (headerText === decodedAnchor || 
            headerText.includes(decodedAnchor) || 
            decodedAnchor.includes(headerText)) {
          targetElement = header;
          console.log('Found by text matching:', targetElement); // Debug log
          break;
        }
      }
    }
    
    if (targetElement) {
      // Smooth scroll to the target element
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      
      // Add a temporary highlight effect
      targetElement.style.transition = 'background-color 0.3s ease';
      const originalBg = targetElement.style.backgroundColor;
      targetElement.style.backgroundColor = state.isDarkTheme ? '#404040' : '#ffffcc';
      
      setTimeout(() => {
        targetElement.style.backgroundColor = originalBg;
      }, 1500);
      
    } else {
      console.warn(`Anchor not found: ${anchorId}`);
      // Don't show alert for missing anchors, just log warning
    }
    
  } catch (error) {
    console.error('Error navigating to anchor:', error);
  }
}

module.exports = {
  updatePreview
};