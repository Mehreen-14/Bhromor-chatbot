import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect } from 'react';
import './css/App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [previousChats, setPreviousChats] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sessionId, setSessionId] = useState(uuidv4());
  const [isTyping, setIsTyping] = useState(false); // New state for typing animation
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);



  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cse.google.com/cse.js?cx=a26bc224caf624533";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchPreviousChats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/chats");
        const data = await res.json();
        setPreviousChats(data);
      } catch (err) {
        console.error("Failed to fetch previous chats", err);
      }
    };
    fetchPreviousChats();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: "user",timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);

    setInput("");
    setIsTyping(true); // Start typing animation

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, sessionId })
      });

      const data = await response.json();
      const botMessage = { text: data.reply, sender: "bot" ,timestamp: data.timestamp || new Date().toISOString()};

      // Simulate typing delay
      setTimeout(() => {
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false); // Stop typing animation
      }, 1000); // Adjust delay as needed
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages(prev => [...prev, { text: "Error sending message.", sender: "bot" }]);
      setIsTyping(false); // Stop typing animation
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(uuidv4());
  };

  const searchMessages = async () => {
    if (!searchQuery.trim()) return;
  
    try {
      const res = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.length === 0) {
        setSearchResults([{ text: "No results found.", sender: "system", timestamp: new Date().toISOString() }]);
      } else {
        setSearchResults(data);
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
  };
  
  const highlightMatch = (text, keyword) => {
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase()
        ? <mark key={i} style={{ backgroundColor: 'yellow' }}>{part}</mark>
        : part
    );
  };
  


  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1><strong>Chats</strong></h1>
          <div className="button-group">
            <button className="new-chat-btn" onClick={startNewChat}>
              <span role="img" aria-label="new chat">➕</span>
            </button>
            <button id="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
              <strong>{isDarkMode ? "🌙" : "🌞"}</strong>
            </button>
          </div>
        </div>
        <h4><strong>Search Chats</strong></h4>
        <div className="search-box">
        <input
          type="text"
          placeholder="Search messages..."
          onChange={(e) => setSearchQuery(e.target.value)}
          value={searchQuery}
        />
        <button onClick={searchMessages}>🔍</button>
        </div>

        <h4><strong>Previous Chats</strong></h4>
        {previousChats.map((chat, index) => (
          <div
            key={index}
            className="chat-preview"
            onClick={() => {
              setMessages(chat.messages);
              setSessionId(chat.sessionId);
            }}
          >
            <p><strong>Chat {index + 1}</strong></p>
          </div>
        ))}
      </div>

      <div className="main-content">
        <div className="chat-header">
          <h1><strong>Bhromor</strong></h1>
          <h3>your curious companion in every conversation</h3>
        </div>

        <div className="chat-box">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.sender}`}>
            <div>
            {typeof msg.text === 'string' ? <strong>{msg.text}</strong> : msg.text}
            </div>
            {msg.timestamp && (
              <div className="timestamp">
                <small>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
              </div>
                )}
            </div>

          ))}
          {isTyping && (
            <div className="message bot">
              <em>Typing...</em>
            </div>
          )}
          {searchResults.length > 0 && (
  <div className="search-results">
    <h3>🔎 Search Results:</h3>
    {searchResults.map((msg, index) => (
      <div key={index} className={`message ${msg.sender}`}>
        <p>
          <strong>{msg.sender}:</strong>{" "}
          {highlightMatch(msg.text, searchQuery)}
        </p>
        <small>{new Date(msg.timestamp).toLocaleString()}</small>
      </div>
    ))}
  </div>
)}

        </div>

        <div className="input-area">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}><strong>Send</strong></button>
        </div>
      </div>
    </div>
  );
}

export default App;

//next works:
//image addition

