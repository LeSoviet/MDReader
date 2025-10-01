/**
 * Preview Module
 * Handles markdown preview rendering
 */

const marked = require('marked');
const Prism = require('prismjs');
const state = require('./state');
const path = require('path');
const { openFilePath } = require('./file-operations');

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
    
    if (!state.editor) {
      preview.innerHTML = '<p>Editor not initialized. Please check the console for errors.</p>';
      return;
    }
    
    const content = state.editor.getValue();
    
    if (!content || content.trim() === '') {
      preview.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No content to preview. Start typing in the editor...</p>';
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
function handlePreviewLinkClick(event) {
  // Check if clicked element is an anchor tag
  if (event.target.tagName === 'A') {
    event.preventDefault();
    const href = event.target.getAttribute('href');
    
    // Only handle relative file paths (not external URLs)
    if (href && !/^https?:\/\//.test(href)) {
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
    // For external URLs, we could open in default browser, but for now we'll just ignore them
  }
}

module.exports = {
  updatePreview
};