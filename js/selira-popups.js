/**
 * Selira AI Popup System
 * Replaces standard browser alerts/confirms with styled popups
 */

// Initialize popup system when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  createPopupContainer();
  overrideBrowserPopups();
});

// Create popup container
function createPopupContainer() {
  if (document.getElementById('selira-popup-container')) return;
  
  const container = document.createElement('div');
  container.id = 'selira-popup-container';
  container.innerHTML = `
    <div class="popup-overlay" id="popupOverlay">
      <div class="popup-modal" id="popupModal">
        <div class="popup-content">
          <div class="popup-header">
            <div class="popup-title" id="popupTitle">selira.ai says</div>
          </div>
          <div class="popup-body">
            <div class="popup-message" id="popupMessage"></div>
          </div>
          <div class="popup-footer">
            <button class="popup-btn popup-btn-primary" id="popupOkBtn">OK</button>
            <button class="popup-btn popup-btn-secondary" id="popupCancelBtn" style="display: none;">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(container);
  addPopupStyles();
  attachPopupEvents();
}

// Add popup styles
function addPopupStyles() {
  if (document.getElementById('selira-popup-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'selira-popup-styles';
  styles.textContent = `
    .popup-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    }
    
    .popup-overlay.show {
      display: flex;
    }
    
    .popup-modal {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border, #333333);
      border-radius: var(--radius-lg, 16px);
      min-width: 400px;
      max-width: 500px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
      animation: popupSlideIn 0.3s ease;
      overflow: hidden;
    }
    
    .popup-content {
      padding: 0;
    }
    
    .popup-header {
      background: var(--bg-tertiary, #2a2a2a);
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border, #333333);
    }
    
    .popup-title {
      font-family: 'Playfair Display', serif;
      font-size: 18px;
      font-weight: 600;
      color: var(--accent, #d4a574);
      margin: 0;
    }
    
    .popup-body {
      padding: 24px;
    }
    
    .popup-message {
      color: var(--text-primary, #ffffff);
      font-size: 16px;
      line-height: 1.5;
      font-family: 'Inter', sans-serif;
    }
    
    .popup-footer {
      padding: 16px 24px 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .popup-btn {
      padding: 12px 24px;
      border-radius: var(--radius-md, 12px);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      font-family: 'Inter', sans-serif;
    }
    
    .popup-btn-primary {
      background: var(--accent, #d4a574);
      color: white;
      min-width: 80px;
    }
    
    .popup-btn-primary:hover {
      background: var(--accent-hover, #c19456);
      transform: translateY(-1px);
    }
    
    .popup-btn-secondary {
      background: transparent;
      color: var(--text-secondary, #b3b3b3);
      border: 1px solid var(--border, #333333);
    }
    
    .popup-btn-secondary:hover {
      background: var(--bg-tertiary, #2a2a2a);
      color: var(--text-primary, #ffffff);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes popupSlideIn {
      from { 
        opacity: 0; 
        transform: scale(0.9) translateY(-20px); 
      }
      to { 
        opacity: 1; 
        transform: scale(1) translateY(0); 
      }
    }
    
    @media (max-width: 480px) {
      .popup-modal {
        min-width: 320px;
        max-width: 90vw;
        margin: 20px;
      }
      
      .popup-footer {
        flex-direction: column;
      }
      
      .popup-btn {
        width: 100%;
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// Attach popup events
function attachPopupEvents() {
  const overlay = document.getElementById('popupOverlay');
  const okBtn = document.getElementById('popupOkBtn');
  const cancelBtn = document.getElementById('popupCancelBtn');
  
  // Close on overlay click
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      closePopup();
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('show')) {
      closePopup();
    }
  });
  
  // OK button
  okBtn.addEventListener('click', function() {
    const callback = okBtn._callback;
    closePopup();
    if (callback) callback(true);
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', function() {
    const callback = cancelBtn._callback;
    closePopup();
    if (callback) callback(false);
  });
}

// Show popup
function showPopup(message, title = 'selira.ai says', type = 'alert', callback = null) {
  const overlay = document.getElementById('popupOverlay');
  const titleEl = document.getElementById('popupTitle');
  const messageEl = document.getElementById('popupMessage');
  const okBtn = document.getElementById('popupOkBtn');
  const cancelBtn = document.getElementById('popupCancelBtn');
  
  titleEl.textContent = title;
  messageEl.innerHTML = message;
  
  // Configure buttons based on type
  if (type === 'confirm') {
    okBtn.textContent = 'OK';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.display = 'block';
  } else {
    okBtn.textContent = 'OK';
    cancelBtn.style.display = 'none';
  }
  
  // Set callbacks
  okBtn._callback = callback;
  cancelBtn._callback = callback;
  
  overlay.classList.add('show');
  
  // Focus OK button
  setTimeout(() => okBtn.focus(), 100);
}

// Close popup
function closePopup() {
  const overlay = document.getElementById('popupOverlay');
  overlay.classList.remove('show');
}

// Override browser popups
function overrideBrowserPopups() {
  // Override alert
  window.alert = function(message) {
    showPopup(message, 'selira.ai says', 'alert');
  };
  
  // Override confirm
  window.confirm = function(message) {
    return new Promise((resolve) => {
      showPopup(message, 'selira.ai says', 'confirm', resolve);
    });
  };
}

// Export functions for manual use
window.SeliraPopups = {
  alert: (message, title) => showPopup(message, title || 'selira.ai says', 'alert'),
  confirm: (message, title) => new Promise(resolve => showPopup(message, title || 'selira.ai says', 'confirm', resolve)),
  show: showPopup,
  close: closePopup
};