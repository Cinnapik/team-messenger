import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function ChatTest() {
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

function getSuggestions(text) {
  const rules = [
    { kw: ["ошибк", "bug", "фикс"], title: "Исправить ошибку", description: `Обнаружена проблема: ${text}` },
    { kw: ["рефактор", "оптимиз", "перепис"], title: "Рефакторинг", description: `Требуется рефакторинг: ${text}` },
    { kw: ["добав", "реализ", "имплем"], title: "Добавить функционал", description: `Добавить: ${text}` }
  ];
  const found = [];
  const low = (text||"").toLowerCase();
  for (const r of rules) {
    if (r.kw.some(k => low.includes(k))) found.push({ title: r.title, description: r.description });
  }
  return found;
}


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

  // Заменить функцию send в ChatTest.jsx
const send = async () => {
  if (!text) return;
  if (!connection || connection.state !== "Connected") {
    console.error("SignalR: не подключён или неверное состояние", connection?.state);
    alert("Ошибка: не подключено к серверу. Проверьте сервер и перезапустите клиент.");
    return;
  }
  console.log("Invoking SendMessage:", text);
  try {
    // вызов с taskId по умолчанию null
    await connection.invoke("SendMessage", "You", text, null);
    console.log("Invoke successful");
    setText("");
  } catch (err) {
    console.error("Invoke error:", err);
    alert("Ошибка при отправке сообщения: см. консоль");
  }
};


  return (
    <div>
      <div style={{ border: "1px solid #ddd", padding: 10, height: 300, overflowY: "auto", marginBottom: 10 }}>
        {messages.map((m, i) => (
  <div key={i} style={{ marginBottom: 6 }}>
    <div><b>{m.user}</b> <small style={{ color: "#666" }}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</small></div>
    <div>{m.text}</div>
    <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
  <button
    style={{
      padding: "4px 8px",
      fontSize: 12,
      borderRadius: 6,
      background: "#0b5cff",
      color: "#fff",
      border: "none",
      cursor: "pointer"
    }}
    onClick={async () => {
      const title = prompt("Название задачи:", m.text.slice(0, 50));
      if (!title) return;
      const desc = prompt("Описание задачи:", m.text) || "";
      await fetch("http://localhost:5028/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc })
      });
      alert("Задача создана");
    }}
  >
    Создать задачу
  </button>

  <button
    style={{
      padding: "4px 8px",
      fontSize: 12,
      borderRadius: 6,
      background: "#6c757d",
      color: "#fff",
      border: "none",
      cursor: "pointer"
    }}
    onClick={() => {
      const suggestions = getSuggestions(m.text);
      if (suggestions.length === 0) return alert("Нет предложений от помощника");
      const s = suggestions[0];
      if (confirm(`Помощник предлагает:\n${s.title}\n\nСоздать?`)) {
        fetch("http://localhost:5028/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: s.title, description: s.description })
        }).then(() => alert("Задача создана"));
      }
    }}
  >
    Помощник
  </button>

  <button
    style={{
      padding: "4px 8px",
      fontSize: 12,
      borderRadius: 6,
      background: "#dc3545",
      color: "#fff",
      border: "none",
      cursor: "pointer"
    }}
    onClick={async () => {
      if (!confirm("Удалить сообщение?")) return;
      // если нужно — реализовать API удаления сообщений на сервере; временно удаляем локально:
      setMessages(prev => prev.filter(x => x !== m));
      alert("Сообщение удалено локально");
    }}
  >
    Удалить
  </button>
</div>

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
