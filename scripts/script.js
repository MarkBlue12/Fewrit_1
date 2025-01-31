// scripts/script.js
document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    async function getAIResponse(message) {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
          });
    
          const data = await response.json();
          return data.response;
        } catch (error) {
          return "Sorry, I'm having trouble connecting to the knowledge base.";
        }
      }
    
    async function handleUserMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        userInput.value = '';

        // Get AI response
        const botResponse = await getAIResponse(message);
        addMessage(botResponse, 'bot');
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">${text}</div>
        `;
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Event Listeners
    sendBtn.addEventListener('click', handleUserMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserMessage();
    });
});