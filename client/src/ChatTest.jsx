import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function ChatTest() {
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    // Загрузить историю сообщений при монтировании
    fetch("http://localhost:5028/api/messages")
      .then(res => res.json())
      .then(data => setMessages(data || []))
      .catch(err => console.error("History fetch error:", err));

    const conn = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5028/hubs/chat")
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    conn.start()
      .then(() => console.log("SignalR connected"))
      .catch(err => console.error("SignalR start error:", err));

    conn.on("ReceiveMessage", (user, message, createdAt) => {
      console.log("ReceiveMessage event:", user, message, createdAt);
      setMessages(prev => [...prev, { user, text: message, createdAt }]);
    });

    setConnection(conn);

    return () => {
      conn.stop().catch(()=>{});
    };
  }, []);

  const send = async () => {
    if (!text || !connection) return;
    console.log("Invoking SendMessage with", text);
    try {
      await connection.invoke("SendMessage", "You", text);
      console.log("Invoke successful");
      setText("");
    } catch (err) {
      console.error("Invoke error:", err);
    }
  };

  return (
    <div>
      <div style={{ border: "1px solid #ddd", padding: 10, height: 300, overflowY: "auto", marginBottom: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div><b>{m.user}</b> <small style={{ color: "#666" }}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</small></div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Напиши сообщение..."
        style={{ width: "70%", marginRight: 8 }}
      />
      <button onClick={send}>Отправить</button>
    </div>
  );
}
