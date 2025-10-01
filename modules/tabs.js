/**
 * Tab Management Module
 * Handles tab creation, switching, and closing
 */

const state = require('./state');

/**
 * Creates a new tab
 */
function createNewTab(filePath = null, content = null) {
  try {
    const tabId = `tab-${state.tabCounter++}`;
    const fileName = filePath ? filePath.split('\\').pop() : 'Untitled';
    
    const tabData = {
      id: tabId,
      filePath: filePath,
      fileName: fileName,
      content: content || '',
      isModified: false
    };
    
    state.tabs.push(tabData);
    
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.id = `tab-${tabId}`;
    tabElement.dataset.tabId = tabId;
    
    tabElement.innerHTML = `
      <span class="tab-title">${fileName}</span>
      <span class="tab-close" data-tab-id="${tabId}">
        <i class="fas fa-times"></i>
      </span>
    `;
    
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
    
    tabElement.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close') || e.target.closest('.tab-close')) {
        closeTab(tabId);
      } else {
        switchToTab(tabId);
      }
    });
    
    tabElement.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(tabId);
      }
    });
    
    switchToTab(tabId);
    return tabId;
  } catch (error) {
    console.error('Error creating new tab:', error);
  }
}

/**
 * Switches to a specific tab
 */
function switchToTab(tabId) {
  try {
    state.activeTabId = tabId;
    
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tabId === tabId);
    });
    
    const tabData = state.tabs.find(tab => tab.id === tabId);
    if (!tabData) return;
    
    if (state.editor) {
      state.isApplyingEditorContent = true;
      try {
        state.editor.setValue(tabData.content);
      } finally {
        state.isApplyingEditorContent = false;
      }
    }
    
    state.currentFilePath = tabData.filePath;
    state.currentFileName = tabData.fileName;
    state.isModified = tabData.isModified;
    
    const { updateWindowTitle, updateStatusBar } = require('./ui');
    const { updatePreview } = require('./preview');
    updateWindowTitle();
    updateStatusBar();
    updatePreview();
  } catch (error) {
    console.error('Error switching to tab:', error);
  }
}

/**
 * Closes a tab
 */
function closeTab(tabId, skipConfirmation = false) {
  try {
    const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;
    
    const tabData = state.tabs[tabIndex];
    if (!skipConfirmation && tabData.isModified && tabData.filePath) {
      const response = confirm(`You have unsaved changes in ${tabData.fileName}. Continue without saving?`);
      if (!response) return;
    }
    
    const tabElement = document.getElementById(`tab-${tabId}`);
    if (tabElement) tabElement.remove();
    
    state.tabs.splice(tabIndex, 1);
    
    if (state.activeTabId === tabId) {
      if (state.tabs.length > 0) {
        const newActiveIndex = tabIndex < state.tabs.length ? tabIndex : state.tabs.length - 1;
        switchToTab(state.tabs[newActiveIndex].id);
      } else {
        // No tabs left, but don't create a new one automatically
        // Reset editor content to empty
        if (state.editor) {
          state.editor.setValue('');
        }
        state.currentFilePath = null;
        state.currentFileName = 'Untitled';
        state.isModified = false;
        
        const { updateWindowTitle, updateStatusBar } = require('./ui');
        const { updatePreview } = require('./preview');
        updateWindowTitle();
        updateStatusBar();
        updatePreview();
      }
    }
  } catch (error) {
    console.error('Error closing tab:', error);
  }
}

/**
 * Updates active tab content
 */
function updateActiveTabContent() {
  try {
    if (!state.activeTabId || !state.editor) return;
    
    const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);
    if (!activeTab) return;
    
    activeTab.content = state.editor.getValue();
    activeTab.isModified = state.isModified;
    
    if (!activeTab.filePath && activeTab.fileName === 'Untitled') {
      const firstLine = activeTab.content.split('\n')[0];
      if (firstLine.trim() !== '') {
        const title = firstLine.trim().substring(0, 20) + (firstLine.trim().length > 20 ? '...' : '');
        activeTab.fileName = title;
        
        const tabElement = document.querySelector(`.tab[data-tab-id="${state.activeTabId}"] .tab-title`);
        if (tabElement) tabElement.textContent = title;
      }
    }
  } catch (error) {
    console.error('Error updating active tab content:', error);
  }
}

module.exports = {
  createNewTab,
  switchToTab,
  closeTab,
  updateActiveTabContent
};
