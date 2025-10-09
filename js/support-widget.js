/**
 * Support Widget - Chat-style feedback/support interface
 * No external dependencies - pure vanilla JS
 */

(function() {
  'use strict';

  // Create widget HTML
  const widgetHTML = `
    <!-- Support Widget Button -->
    <div id="supportWidgetBtn" class="support-widget-btn" title="Need help?">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>

    <!-- Support Widget Chat Window -->
    <div id="supportWidgetChat" class="support-widget-chat">
      <div class="support-widget-header">
        <h3>Support</h3>
        <button id="supportWidgetClose" class="support-widget-close" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="support-widget-body">
        <form id="supportWidgetForm" class="support-widget-form">
          <textarea
            id="supportMessage"
            placeholder="How can we help you?"
            class="support-textarea"
            rows="3"
            required
            maxlength="2000"
          ></textarea>
          <div class="support-widget-footer">
            <div class="support-char-count" id="supportCharCount">0 / 2000</div>
            <button type="submit" class="support-submit-btn" id="supportSubmitBtn">
              <span id="supportSubmitText">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Create widget styles
  const widgetStyles = `
    <style>
      .support-widget-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #ce93d8 0%, #ba68c8 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(206, 147, 216, 0.4);
        transition: all 0.3s ease;
        z-index: 9998;
        color: white;
      }

      .support-widget-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(206, 147, 216, 0.5);
      }

      .support-widget-chat {
        position: fixed;
        bottom: 84px;
        right: 24px;
        width: 300px;
        max-width: calc(100vw - 48px);
        background: #1a1a1a;
        border: 1px solid #333333;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        display: none;
        flex-direction: column;
        z-index: 9999;
        animation: slideUp 0.3s ease;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .support-widget-chat.open {
        display: flex;
      }

      .support-widget-header {
        padding: 12px 16px;
        background: linear-gradient(135deg, #ce93d8 0%, #ba68c8 100%);
        border-radius: 12px 12px 0 0;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .support-widget-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        font-family: 'Inter', sans-serif;
      }

      .support-widget-close {
        background: transparent;
        border: none;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        transition: all 0.2s ease;
        opacity: 0.8;
      }

      .support-widget-close:hover {
        opacity: 1;
      }

      .support-widget-body {
        padding: 14px;
        display: flex;
        flex-direction: column;
      }

      .support-widget-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .support-textarea {
        padding: 10px;
        background: #2a2a2a;
        border: 1px solid #333333;
        border-radius: 8px;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
        color: #ffffff;
        transition: border-color 0.2s ease;
        resize: none;
        min-height: 70px;
      }

      .support-textarea::placeholder {
        color: #888888;
      }

      .support-textarea:focus {
        outline: none;
        border-color: #ce93d8;
      }

      .support-widget-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .support-char-count {
        font-size: 11px;
        color: #888888;
        font-family: 'Inter', sans-serif;
      }

      .support-submit-btn {
        background: linear-gradient(135deg, #ce93d8 0%, #ba68c8 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .support-submit-btn:hover {
        opacity: 0.9;
      }

      .support-submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .support-success-message {
        background: #10b981;
        color: white;
        padding: 10px 12px;
        border-radius: 6px;
        text-align: center;
        font-size: 13px;
        font-family: 'Inter', sans-serif;
        animation: fadeIn 0.3s ease;
        border: 1px solid #059669;
        margin-bottom: 10px;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @media (max-width: 480px) {
        .support-widget-chat {
          bottom: 84px;
          right: 16px;
          left: 16px;
          width: auto;
        }

        .support-widget-btn {
          bottom: 20px;
          right: 20px;
        }
      }
    </style>
  `;

  // Initialize widget when DOM is ready
  function initWidget() {
    // Add styles
    document.head.insertAdjacentHTML('beforeend', widgetStyles);

    // Add widget HTML
    document.body.insertAdjacentHTML('beforeend', widgetHTML);

    // Get elements
    const btn = document.getElementById('supportWidgetBtn');
    const chat = document.getElementById('supportWidgetChat');
    const closeBtn = document.getElementById('supportWidgetClose');
    const form = document.getElementById('supportWidgetForm');
    const bodyContainer = document.querySelector('.support-widget-body');

    // Toggle chat
    btn.addEventListener('click', () => {
      chat.classList.toggle('open');
    });

    closeBtn.addEventListener('click', () => {
      chat.classList.remove('open');
    });

    // Character counter
    const messageTextarea = document.getElementById('supportMessage');
    const charCount = document.getElementById('supportCharCount');

    messageTextarea.addEventListener('input', () => {
      const length = messageTextarea.value.length;
      charCount.textContent = `${length} / 2000`;
      if (length > 1900) {
        charCount.style.color = '#f44336';
      } else {
        charCount.style.color = '#999';
      }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('supportSubmitBtn');
      const submitText = document.getElementById('supportSubmitText');
      const message = document.getElementById('supportMessage').value.trim();

      if (!message) return;

      // Disable form
      submitBtn.disabled = true;
      submitText.textContent = 'Sending...';

      // Get user info from localStorage (auto-filled for logged-in users)
      let userInfo = {
        userId: null,
        userName: 'Anonymous',
        userEmail: null
      };

      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        userInfo.userId = user.email || user.supabase_id || null;
        userInfo.userName = user.display_name || user.name || 'Anonymous';
        userInfo.userEmail = user.email || null;
      } catch (e) {
        console.log('No user data found in localStorage');
      }

      try {
        // Send to backend with auto-filled user info
        const response = await fetch('/.netlify/functions/support-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userInfo.userName,
            email: userInfo.userEmail,
            message: message,
            userId: userInfo.userId,
            url: window.location.href,
            userAgent: navigator.userAgent
          })
        });

        const data = await response.json();

        if (response.ok) {
          // Show success message
          const successMsg = document.createElement('div');
          successMsg.className = 'support-success-message';
          successMsg.textContent = 'Message sent! We\'ll get back to you soon. 😊';
          bodyContainer.insertBefore(successMsg, form);
          form.reset();

          // Close chat after 2 seconds
          setTimeout(() => {
            chat.classList.remove('open');
            // Remove success message after closing
            setTimeout(() => successMsg.remove(), 500);
          }, 2000);
        } else {
          // Log error details for debugging
          console.error('❌ Support message failed:', data);

          const errorMsg = document.createElement('div');
          errorMsg.className = 'support-success-message';
          errorMsg.style.background = '#ef4444';
          errorMsg.style.borderColor = '#dc2626';
          errorMsg.textContent = 'Something went wrong. Please try again.';
          bodyContainer.insertBefore(errorMsg, form);
          setTimeout(() => errorMsg.remove(), 5000);
        }
      } catch (error) {
        console.error('Support message error:', error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'support-success-message';
        errorMsg.style.background = '#ef4444';
        errorMsg.style.borderColor = '#dc2626';
        errorMsg.textContent = 'Something went wrong. Please try again.';
        bodyContainer.insertBefore(errorMsg, form);
        setTimeout(() => errorMsg.remove(), 5000);
      } finally {
        submitBtn.disabled = false;
        submitText.textContent = 'Send';
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
