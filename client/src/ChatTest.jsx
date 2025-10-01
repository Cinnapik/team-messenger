import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function ChatTest() {
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

useEffect(() => {
  const conn = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5028/hubs/chat")
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

  conn.start()
    .then(() => console.log("SignalR connected"))
    .catch(err => console.error("SignalR start error:", err));

  conn.on("ReceiveMessage", (user, message) => {
    console.log("ReceiveMessage event:", user, message);
    setMessages(prev => [...prev, { user, message }]);
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
      <div style={{ border: "1px solid #ddd", padding: 10, height: 200, overflowY: "auto", marginBottom: 10 }}>
        {messages.map((m, i) => (
          <div key={i}><b>{m.user}:</b> {m.message}</div>
        ))}
      </div>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write message..."
        style={{ width: "70%", marginRight: 8 }}
      />
      <button onClick={send}>Send</button>
    </div>
  );
}
