/**
 * Support Widget - Chat-style feedback/support interface
 * No external dependencies - pure vanilla JS
 */

(function() {
  'use strict';

  // Create widget HTML
  const widgetHTML = `
    <!-- Support Widget Button -->
    <div id="supportWidgetBtn" class="support-widget-btn" title="Hulp nodig?">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>

    <!-- Support Widget Chat Window -->
    <div id="supportWidgetChat" class="support-widget-chat">
      <div class="support-widget-header">
        <div>
          <h3>💬 Support & Feedback</h3>
          <p class="support-widget-subtitle">We helpen je graag!</p>
        </div>
        <button id="supportWidgetClose" class="support-widget-close" title="Sluiten">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="support-widget-body">
        <div class="support-widget-messages" id="supportWidgetMessages">
          <div class="support-message support-message-bot">
            <div class="support-message-avatar">🤖</div>
            <div class="support-message-content">
              <p>Hoi! Hoe kunnen we je helpen? Stel gerust je vraag of deel je feedback.</p>
            </div>
          </div>
        </div>

        <form id="supportWidgetForm" class="support-widget-form">
          <div class="support-form-field">
            <textarea
              id="supportMessage"
              placeholder="Typ je vraag of feedback hier..."
              class="support-textarea"
              rows="5"
              required
              maxlength="2000"
            ></textarea>
            <div class="support-char-count" id="supportCharCount">0 / 2000</div>
          </div>
          <button type="submit" class="support-submit-btn" id="supportSubmitBtn">
            <span id="supportSubmitText">Verstuur</span>
            <svg id="supportSubmitIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
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
        bottom: 96px;
        right: 24px;
        width: 380px;
        max-width: calc(100vw - 48px);
        max-height: calc(100vh - 140px);
        background: #1a1a1a;
        border: 1px solid #333333;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        display: none;
        flex-direction: column;
        z-index: 9999;
        animation: slideUp 0.3s ease;
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
        padding: 20px;
        background: linear-gradient(135deg, #ce93d8 0%, #ba68c8 100%);
        border-radius: 16px 16px 0 0;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .support-widget-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .support-widget-subtitle {
        margin: 4px 0 0 0;
        font-size: 13px;
        opacity: 0.9;
      }

      .support-widget-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 8px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        transition: all 0.2s ease;
      }

      .support-widget-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .support-widget-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
        max-height: calc(100vh - 220px);
      }

      .support-widget-messages {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .support-message {
        display: flex;
        gap: 10px;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .support-message-bot {
        align-items: flex-start;
      }

      .support-message-user {
        align-items: flex-end;
        flex-direction: row-reverse;
      }

      .support-message-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }

      .support-message-content {
        background: #2a2a2a;
        color: #ffffff;
        padding: 12px 16px;
        border-radius: 12px;
        max-width: 70%;
        border: 1px solid #333333;
      }

      .support-message-user .support-message-content {
        background: linear-gradient(135deg, #ce93d8 0%, #ba68c8 100%);
        color: white;
        border: none;
      }

      .support-message-content p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
      }

      .support-widget-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .support-form-field {
        display: flex;
        flex-direction: column;
      }

      .support-input,
      .support-textarea {
        padding: 12px;
        background: #2a2a2a;
        border: 1px solid #333333;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        color: #ffffff;
        transition: border-color 0.2s ease;
      }

      .support-input::placeholder,
      .support-textarea::placeholder {
        color: #888888;
      }

      .support-input:focus,
      .support-textarea:focus {
        outline: none;
        border-color: #ce93d8;
      }

      .support-textarea {
        resize: vertical;
        min-height: 100px;
      }

      .support-char-count {
        text-align: right;
        font-size: 12px;
        color: #888888;
        margin-top: 4px;
      }

      .support-submit-btn {
        background: linear-gradient(135deg, #ce93d8 0%, #ba68c8 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s ease;
      }

      .support-submit-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(206, 147, 216, 0.4);
      }

      .support-submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .support-success-message {
        background: #10b981;
        color: white;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        font-size: 14px;
        animation: fadeIn 0.3s ease;
        border: 1px solid #059669;
      }

      @media (max-width: 480px) {
        .support-widget-chat {
          bottom: 90px;
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
    const messagesContainer = document.getElementById('supportWidgetMessages');

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
      submitText.textContent = 'Versturen...';

      // Add user message to chat
      addMessage(message, 'user');

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

        if (response.ok) {
          // Show success
          addMessage('Bedankt voor je bericht! We nemen zo snel mogelijk contact op. 😊', 'bot');
          form.reset();

          // Close chat after 3 seconds
          setTimeout(() => {
            chat.classList.remove('open');
          }, 3000);
        } else {
          addMessage('Er ging iets mis. Probeer het later opnieuw.', 'bot');
        }
      } catch (error) {
        console.error('Support message error:', error);
        addMessage('Er ging iets mis. Probeer het later opnieuw.', 'bot');
      } finally {
        submitBtn.disabled = false;
        submitText.textContent = 'Verstuur';
      }
    });

    // Helper to add message to chat
    function addMessage(text, type) {
      const messageHTML = `
        <div class="support-message support-message-${type}">
          <div class="support-message-avatar">${type === 'bot' ? '🤖' : '👤'}</div>
          <div class="support-message-content">
            <p>${text}</p>
          </div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
