import React, { useState, useRef, useEffect } from 'react';

/**
 * LiteratureChat Component
 * AI-powered chat interface trained on AA approved literature
 * Features: Big Book Q&A, Step Work guidance, Crisis recognition
 */
const LiteratureChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: `Welcome to your Digital Sponsor! 🤝 

I'm here to provide support based on AA approved literature including the Big Book, Twelve Steps and Twelve Traditions, and Daily Reflections.

I can help you with:
• Questions about the literature 📖
• Step work guidance (especially 4th Step) 📋  
• Daily reflections and prayers 🙏
• Finding meetings in your area 🏛️
• Crisis support resources 🆘

How can I support your recovery today?`,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate AI response (in production, this would call your LLM API)
  const generateAIResponse = async (userMessage) => {
    setIsTyping(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let response = '';
    const lowercaseMessage = userMessage.toLowerCase();
    
    // AA Literature Responses
    if (lowercaseMessage.includes('4th step') || lowercaseMessage.includes('fourth step')) {
      response = `The 4th Step is about making "a searching and fearless moral inventory of ourselves." 📋

From the Big Book: "We made a searching and fearless moral inventory of ourselves."

Key aspects of the 4th Step:
• **Resentments**: List people, institutions, or principles you resent
• **Fears**: Identify what frightens or worries you  
• **Harm to others**: Consider how your actions affected others
• **Sex conduct**: Review your sexual behavior and relationships

Would you like help with any specific part of your 4th Step work? I can provide worksheets and guidance while maintaining your complete privacy.`;
    
    } else if (lowercaseMessage.includes('amends') || lowercaseMessage.includes('8th') || lowercaseMessage.includes('9th')) {
      response = `Steps 8 and 9 are about making amends to those we've harmed. 🤝

**Step 8**: "Made a list of all persons we had harmed, and became willing to make amends to them all."

**Step 9**: "Made direct amends to such people wherever possible, except when to do so would injure them or others."

Important principles:
• **Timing matters** - Don't rush the amends process
• **Safety first** - Avoid amends that would cause harm
• **Be thorough** - Include everyone you've harmed
• **Stay humble** - Focus on your part, not theirs

What specific guidance do you need with your amends work?`;
    
    } else if (lowercaseMessage.includes('serenity prayer') || lowercaseMessage.includes('prayer')) {
      response = `The Serenity Prayer is central to AA recovery: 🙏

**"God, grant me the serenity to accept the things I cannot change,**
**The courage to change the things I can,**
**And the wisdom to know the difference."**

This prayer teaches us:
• **Acceptance** of what's beyond our control
• **Action** on what we can influence  
• **Wisdom** to distinguish between the two

Many find comfort in reciting this prayer during difficult moments. Would you like to discuss how to apply these principles to a specific situation you're facing?`;
    
    } else if (lowercaseMessage.includes('crisis') || lowercaseMessage.includes('help') || lowercaseMessage.includes('emergency')) {
      response = `I notice you might need immediate support. 🆘

**Immediate Crisis Resources:**
• **National Suicide Prevention Lifeline**: 988
• **Crisis Text Line**: Text HOME to 741741  
• **SAMHSA Helpline**: 1-800-662-4357
• **AA Hotline**: Check your local directory

**Remember:**
• You are not alone in this struggle
• Crisis feelings are temporary
• There are people who want to help
• Your recovery matters

If this is a medical emergency, please call 911 immediately.

Would you like me to help you find local AA meetings or other recovery resources?`;
    
    } else if (lowercaseMessage.includes('meeting') || lowercaseMessage.includes('meetings')) {
      response = `Meetings are the heart of AA recovery! 🏛️

**Types of AA Meetings:**
• **Open**: Anyone can attend
• **Closed**: Only those with drinking problems
• **Speaker**: Features someone sharing their story
• **Discussion**: Group conversation on recovery topics
• **Big Book**: Study of AA literature

**Finding Meetings:**
• Visit AA.org for local directories
• Try online meetings for 24/7 access
• Look for beginner-friendly meetings
• Consider different meeting personalities

**Virtual Meeting Benefits:**
• Available anytime, anywhere
• Anonymous participation
• Easy to try different groups

Would you like help finding meetings in your area or information about online meetings?`;
    
    } else if (lowercaseMessage.includes('sponsor') || lowercaseMessage.includes('sponsorship')) {
      response = `A sponsor is crucial for working the AA program! 🤝

**What a Sponsor Does:**
• Guides you through the 12 Steps
• Shares their experience and recovery
• Provides accountability and support
• Offers a phone number for crisis moments

**Finding a Sponsor:**
• Listen at meetings for someone with solid recovery
• Look for someone who has what you want
• Choose someone of the same gender
• Ask someone with time in the program

**Temporary Sponsors:**
• It's okay to start with temporary guidance
• You can change sponsors if needed
• Multiple people can provide support

Remember: A sponsor is not a therapist or counselor, but a fellow alcoholic sharing their experience.

Are you looking for guidance on finding a sponsor or working with one?`;
    
    } else {
      response = `Thank you for sharing. 🤝

I'm here to provide support based on AA literature and principles. I can help you with:

• **Literature questions** about the Big Book, Twelve and Twelve
• **Step work** especially 4th Step inventories  
• **Daily reflections** and spiritual practices
• **Meeting information** and recovery resources
• **Crisis support** and emergency contacts

What aspect of recovery would you like to explore today? I'm here to help with whatever you're facing.`;
    }
    
    setIsTyping(false);
    return response;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputText,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    const aiResponse = await generateAIResponse(inputText);
    const aiMessage = {
      id: Date.now() + 1,
      type: 'ai',
      content: aiResponse,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, aiMessage]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="literature-chat">
      <div className="chat-header">
        <h2>🤝 Digital Sponsor Chat</h2>
        <p>AI trained on AA approved literature</p>
      </div>
      
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}-message`}>
            <div className="message-content">
              {message.content.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message ai-message typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about the Big Book, Steps, recovery guidance..."
          className="chat-input"
          rows="1"
        />
        <button 
          onClick={handleSendMessage}
          className="send-button"
          disabled={!inputText.trim()}
        >
          Send
        </button>
      </div>
      
      <style jsx>{`
        .literature-chat {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-height: 600px;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .chat-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }
        
        .chat-header h2 {
          margin: 0 0 5px 0;
          font-size: 1.5rem;
        }
        
        .chat-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.9rem;
        }
        
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f8f9fa;
        }
        
        .message {
          margin-bottom: 20px;
          max-width: 80%;
        }
        
        .user-message {
          margin-left: auto;
        }
        
        .user-message .message-content {
          background: #007bff;
          color: white;
          padding: 12px 16px;
          border-radius: 20px 20px 4px 20px;
        }
        
        .ai-message .message-content {
          background: white;
          color: #333;
          padding: 16px;
          border-radius: 20px 20px 20px 4px;
          border: 1px solid #e9ecef;
          white-space: pre-line;
        }
        
        .message-time {
          font-size: 0.8rem;
          color: #6c757d;
          margin-top: 5px;
          text-align: right;
        }
        
        .ai-message .message-time {
          text-align: left;
        }
        
        .typing-indicator {
          display: flex;
          align-items: center;
          padding: 16px;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          background: #6c757d;
          border-radius: 50%;
          display: inline-block;
          margin-right: 5px;
          animation: typing 1.4s infinite ease-in-out both;
        }
        
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        
        .chat-input-container {
          display: flex;
          padding: 20px;
          background: white;
          border-top: 1px solid #e9ecef;
        }
        
        .chat-input {
          flex: 1;
          border: 1px solid #e9ecef;
          border-radius: 25px;
          padding: 12px 20px;
          font-size: 16px;
          resize: none;
          outline: none;
          font-family: inherit;
        }
        
        .chat-input:focus {
          border-color: #667eea;
        }
        
        .send-button {
          margin-left: 10px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 25px;
          padding: 12px 24px;
          cursor: pointer;
          font-weight: 600;
          transition: background-color 0.2s;
        }
        
        .send-button:hover:not(:disabled) {
          background: #5a67d8;
        }
        
        .send-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default LiteratureChat;