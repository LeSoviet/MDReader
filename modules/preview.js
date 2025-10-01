/**
 * Preview Module
 * Handles markdown preview rendering
 */

const marked = require('marked');
const Prism = require('prismjs');
const state = require('./state');

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
  } catch (error) {
    console.error('Error updating preview:', error);
    const preview = document.getElementById('preview');
    if (preview) {
      preview.innerHTML = '<p style="color: red;">Error rendering preview. Please check the console for errors.</p>';
    }
  }
}

module.exports = {
  updatePreview
};
