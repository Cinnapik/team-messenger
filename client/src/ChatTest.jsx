import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

/*
  client/src/ChatTest.jsx
  Полностью готовый компонент чата для тёмной темы.
  Обратите внимание: styles.css должен быть импортирован в App.jsx / main.jsx.
*/

export default function ChatTest() {
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const SHOW_TASK_BUTTONS = true; // false — скрыть кнопки у сообщений
  const messagesEndRef = React.useRef(null);

  // Загрузка истории и подключение SignalR
  useEffect(() => {
    fetch("http://localhost:5028/api/messages")
      .then(r => r.json())
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

    conn.on("ReceiveMessage", (user, message, createdAt, taskId) => {
      // Если сервер присылает созданное сообщение, добавляем его
      setMessages(prev => [...prev, { id: null, user, text: message, createdAt, taskId }]);
    });

    setConnection(conn);
    return () => { conn.stop().catch(()=>{}); };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Небольшая утилита подсказок
  function getSuggestions(text){
    const rules = [
      { kw: ["ошибк","bug","фикс"], title:"Исправить ошибку", description:`Обнаружена проблема: ${text}` },
      { kw: ["рефактор","оптимиз","перепис"], title:"Рефакторинг", description:`Рефакторинг: ${text}` },
      { kw: ["добав","реализ","имплем"], title:"Добавить функционал", description:`Добавить: ${text}` }
    ];
    const low = (text||"").toLowerCase();
    return rules.filter(r => r.kw.some(k => low.includes(k))).map(r => ({title:r.title, description:r.description}));
  }

  // Создать задачу из сообщения и привязать через API
  const createTaskFromMessage = async (message) => {
    const title = prompt("Название задачи:", (message.text||"").slice(0,50));
    if (!title) return;
    const desc = prompt("Описание задачи:", message.text||"") || "";
    try {
      const res = await fetch("http://localhost:5028/api/tasks", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ title, description: desc, status:"todo" })
      });
      if (!res.ok) throw new Error("Ошибка создания задачи");
      const created = await res.json();
      if (message.id) {
        await fetch(`http://localhost:5028/api/messages/${message.id}/assignTask/${created.id}`, { method:"PATCH" });
      }
      if (window.fetchTasksGlobal) window.fetchTasksGlobal();
      alert("Задача создана и привязана");
    } catch(e){
      console.error(e);
      alert("Ошибка создания задачи");
    }
  };

  // Отправка сообщения через SignalR
  const send = async () => {
    if (!text) return;
    if (!connection || connection.state !== "Connected") {
      alert("Не подключено к серверу");
      return;
    }
    try {
      await connection.invoke("SendMessage","You", text, null);
      setText("");
    } catch(e){
      console.error("Invoke error:", e);
      alert("Ошибка при отправке");
    }
  };

  const btnStyle = { padding:"6px 10px", fontSize:13, borderRadius:6, border:"none", cursor:"pointer" };

  return (
    <div className="panel chat-panel">
      <div className="chat-status">{(!connection || connection.state !== "Connected") ? "Отключено" : "Подключено"}</div>

      <div className="chat-history" role="list">
        {messages.map((m, i) => (
          <div key={i} className="msg" role="listitem">
            <div className="msg-header">
              <div className="msg-user">{m.user}</div>
              <div className="msg-time">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</div>
            </div>
            <div className="msg-text">{m.text}</div>

            {SHOW_TASK_BUTTONS && (
              <div className="msg-actions">
                <button className="btn btn-primary" style={btnStyle} onClick={() => createTaskFromMessage(m)}>Создать задачу</button>

                <button className="btn btn-secondary" style={btnStyle} onClick={() => {
                  const suggestions = getSuggestions(m.text);
                  if (!suggestions.length) return alert("Нет предложений");
                  const s = suggestions[0];
                  if (confirm(`Помощник предлагает:\n${s.title}\n\nСоздать?`)) {
                    fetch("http://localhost:5028/api/tasks", {
                      method:"POST",
                      headers:{"Content-Type":"application/json"},
                      body: JSON.stringify({ title:s.title, description:s.description, status:"todo" })
                    }).then(()=>{ if (window.fetchTasksGlobal) window.fetchTasksGlobal(); alert("Создано"); });
                  }
                }}>Помощник</button>

                <button className="btn btn-danger" style={btnStyle} onClick={async () => {
                  if (!confirm("Удалить сообщение?")) return;
                  if (m.id) await fetch(`http://localhost:5028/api/messages/${m.id}`, { method:"DELETE" });
                  setMessages(prev => prev.filter(x => x !== m && x.id !== m.id));
                }}>Удалить</button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row" style={{ marginTop:8 }}>
        <input className="chat-input" value={text} onChange={e => setText(e.target.value)} placeholder="Напишите сообщение..." />
        <button className="btn btn-primary" onClick={send} disabled={!connection || connection.state !== "Connected"} style={{ padding:"8px 12px" }}>
          {(!connection || connection.state !== "Connected") ? "Отключено" : "Отправить"}
        </button>
      </div>
    </div>
  );
}
