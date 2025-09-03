// Selira AI Chat System
// Replaces Make.com webhook calls with direct OpenRouter integration

class SeliraChat {
  constructor() {
    this.isTyping = false;
    this.conversationHistory = [];
    this.currentModel = 'mistralai/mistral-large'; // Default model
  }

  async sendMessage(message, characterSlug) {
    if (this.isTyping || !message.trim()) return;

    try {
      // Get current user
      const user = await window.Selira.auth.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      this.isTyping = true;
      this.showTypingIndicator();

      // Add user message to UI immediately
      this.addMessageToUI('user', message);

      console.log('📤 Sending to OpenRouter:', { message, characterSlug, model: this.currentModel });

      // Call OpenRouter via Netlify Function
      const response = await fetch('/.netlify/functions/openrouter-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          character_slug: characterSlug,
          auth0_id: user.sub,
          model: this.currentModel
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response to UI
      this.addMessageToUI('assistant', data.response);

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: data.response }
      );

      // Log performance metrics
      console.log('📊 Response metrics:', {
        model: data.model_used,
        tokens: data.tokens_used,
        responseTime: Date.now() - data.timestamp
      });

    } catch (error) {
      console.error('❌ Chat error:', error);
      this.addMessageToUI('assistant', data.fallback_response || "I'm having trouble right now. Could you try again?");
    } finally {
      this.isTyping = false;
      this.hideTypingIndicator();
    }
  }

  addMessageToUI(sender, message) {
    const chatContainer = document.getElementById('chatContainer') || document.querySelector('.chat-messages');
    
    if (!chatContainer) {
      console.error('Chat container not found');
      return;
    }

    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-text">${this.formatMessage(message)}</div>
        <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `;

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  formatMessage(message) {
    // Basic message formatting
    return message
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  showTypingIndicator() {
    const chatContainer = document.getElementById('chatContainer') || document.querySelector('.chat-messages');
    
    const typingElement = document.createElement('div');
    typingElement.className = 'message assistant-message typing-indicator';
    typingElement.id = 'typingIndicator';
    
    typingElement.innerHTML = `
      <div class="message-content">
        <div class="typing-animation">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    chatContainer.appendChild(typingElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  // Model switching for different use cases
  setModel(modelName) {
    const availableModels = {
      'mistral-large': 'mistralai/mistral-large',      // Best quality
      'mistral-small': 'mistralai/mistral-small',      // Faster/cheaper
      'claude-haiku': 'anthropic/claude-3-haiku',      // Alternative
      'gpt-4o-mini': 'openai/gpt-4o-mini',             // OpenAI option
      'codestral': 'mistralai/codestral'               // For code conversations
    };

    if (availableModels[modelName]) {
      this.currentModel = availableModels[modelName];
      console.log(`🔄 Model switched to: ${this.currentModel}`);
    }
  }

  // Get chat history from database
  async loadChatHistory(characterSlug) {
    try {
      const user = await window.Selira.auth.getCurrentUser();
      if (!user) return;

      const response = await fetch('/.netlify/functions/get-chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth0_id: user.sub,
          character_slug: characterSlug
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.conversationHistory = data.history || [];
        this.displayHistoryInUI(data.history);
      }

    } catch (error) {
      console.error('❌ Failed to load chat history:', error);
    }
  }

  displayHistoryInUI(history) {
    const chatContainer = document.getElementById('chatContainer') || document.querySelector('.chat-messages');
    if (!chatContainer || !history) return;

    chatContainer.innerHTML = ''; // Clear existing messages

    history.forEach(msg => {
      this.addMessageToUI(msg.MessageType, msg.Content);
    });
  }
}

// Initialize global chat instance
window.SeliraChat = new SeliraChat();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SeliraChat;
}