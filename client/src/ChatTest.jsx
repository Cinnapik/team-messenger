import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

/*
  ChatTest.jsx
  - Принимает событие ReceiveMessage с полным объектом msg
  - Помечает каждый div сообщения атрибутом data-message-id
  - Реагирует на window.scrollToMessageId (устанавливается из Kanban), скроллит к сообщению
  - Меню у сообщения открывается по клику/hover (см. стили)
*/

export default function ChatTest() {
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const messagesEndRef = React.useRef(null);

  useEffect(() => {
    // Загрузка истории (получаем объекты с id и CreatedAt)
    fetch("http://localhost:5028/api/messages")
      .then(r => r.json())
      .then(data => setMessages(data || []))
      .catch(err => console.error("History fetch error:", err));

    // Подключение к SignalR
    const conn = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5028/hubs/chat")
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    conn.start()
      .then(() => console.log("SignalR connected"))
      .catch(err => console.error("SignalR start error:", err));

    // Ожидаем полный объект сообщения от сервера
    conn.on("ReceiveMessage", (msg) => {
      console.log("ReceiveMessage event:", msg);
      setMessages(prev => [...prev, {
        id: msg.id ?? msg.Id ?? null,
        user: msg.user ?? msg.User ?? "Unknown",
        text: msg.text ?? msg.Text ?? "",
        createdAt: msg.createdAt ?? msg.CreatedAt,
        taskId: msg.taskId ?? msg.TaskId ?? null
      }]);
    });

    setConnection(conn);

    return () => {
      conn.stop().catch(() => {});
    };
  }, []);

  // Автоскролл при приходе новых сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Обработка глобального запроса скролла к сообщению
    if (window.scrollToMessageId) {
      const id = window.scrollToMessageId;
      window.scrollToMessageId = null;
      // Найти элемент по data-message-id
      const el = document.querySelector(`[data-message-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // подсветка (временная)
        el.style.transition = "box-shadow 0.3s";
        el.style.boxShadow = "0 0 0 3px rgba(30,144,255,0.12)";
        setTimeout(() => { el.style.boxShadow = ""; }, 1600);
      } else {
        console.warn("Message element not found for id", id);
      }
    }
  }, [messages]);

  // Небольшая rule-based подсказка (помощник)
  function getSuggestions(text) {
    const rules = [
      { kw: ["ошибк", "bug", "фикс"], title: "Исправить ошибку", description: `Обнаружена проблема: ${text}` },
      { kw: ["рефактор", "оптимиз"], title: "Рефакторинг", description: `Требуется рефакторинг: ${text}` },
      { kw: ["добав", "реализ"], title: "Добавить функционал", description: `Добавить: ${text}` }
    ];
    const low = (text || "").toLowerCase();
    return rules.filter(r => r.kw.some(k => low.includes(k))).map(r => ({ title: r.title, description: r.description }));
  }

  const createTaskFromMessage = async (message) => {
    const title = prompt("Название задачи:", (message.text || "").slice(0, 50));
    if (!title) return;
    const desc = prompt("Описание задачи:", message.text || "") || "";
    try {
      const res = await fetch("http://localhost:5028/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc, status: "todo" })
      });
      if (!res.ok) throw new Error("Ошибка создания задачи");
      const created = await res.json();
      // Привязать сообщение к задаче, если у сообщения есть id
      if (message.id) {
        await fetch(`http://localhost:5028/api/messages/${message.id}/assignTask/${created.id}`, { method: "PATCH" });
        // обновим локальный state, поставив taskId у сообщения
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, taskId: created.id } : m));
      }
      if (window.fetchTasksGlobal) window.fetchTasksGlobal();
      alert("Задача создана и привязана");
      setOpenMenuIndex(null);
    } catch (e) {
      console.error(e);
      alert("Ошибка при создании задачи");
    }
  };

  const assistantAction = (message) => {
    const suggestions = getSuggestions(message.text);
    if (!suggestions.length) return alert("Помощник: предложений нет");
    const s = suggestions[0];
    if (confirm(`Помощник предлагает:\n${s.title}\n\nСоздать?`)) {
      fetch("http://localhost:5028/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: s.title, description: s.description, status: "todo" })
      }).then(async (r) => {
        if (r.ok) {
          const created = await r.json();
          if (message.id) {
            await fetch(`http://localhost:5028/api/messages/${message.id}/assignTask/${created.id}`, { method: "PATCH" });
            setMessages(prev => prev.map(m => m.id === message.id ? { ...m, taskId: created.id } : m));
          }
          if (window.fetchTasksGlobal) window.fetchTasksGlobal();
          alert("Задача создана");
        } else {
          alert("Ошибка создания задачи");
        }
      });
    }
    setOpenMenuIndex(null);
  };

  const deleteMessage = async (message) => {
    if (!confirm("Удалить сообщение?")) return;
    if (message.id) await fetch(`http://localhost:5028/api/messages/${message.id}`, { method: "DELETE" });
    setMessages(prev => prev.filter(m => m !== message && m.id !== message.id));
    setOpenMenuIndex(null);
  };

  const send = async () => {
    if (!text) return;
    if (!connection || connection.state !== "Connected") { alert("Не подключено"); return; }
    try {
      await connection.invoke("SendMessage", "You", text, null);
      setText("");
    } catch (e) {
      console.error("Invoke error:", e);
      alert("Ошибка при отправке");
    }
  };

  return (
    <div className="panel chat-panel">
      <div className="chat-status">{(!connection || connection.state !== "Connected") ? "Отключено" : "Подключено"}</div>

      <div className="chat-history" role="list">
        {messages.map((m, i) => (
          <div
            key={i}
            className="msg"
            data-message-id={m.id ?? ""}
            role="listitem"
            onMouseEnter={() => setOpenMenuIndex(i)}
            onMouseLeave={() => setOpenMenuIndex((idx) => idx === i ? null : idx)}
          >
            <div className="msg-header">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div className="msg-user">{m.user}</div>
                <div className="msg-time">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</div>
                {m.taskId ? <span style={{ marginLeft: 8, fontSize: 12, color: "#9aa3b2" }}>🔗 Задача #{m.taskId}</span> : null}
              </div>

              <div>
                <button
                  className="msg-menu-btn"
                  aria-label="Меню сообщения"
                  onClick={(e) => { e.stopPropagation(); setOpenMenuIndex(openMenuIndex === i ? null : i); }}
                >
                  &#x22EE;
                </button>

                <div className={`msg-menu ${openMenuIndex === i ? "" : "hidden"}`} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => createTaskFromMessage(m)}>Создать задачу</button>
                  <button onClick={() => assistantAction(m)}>Помощник</button>
                  <button onClick={() => deleteMessage(m)} style={{ color: "var(--danger)" }}>Удалить</button>
                </div>
              </div>
            </div>

            <div className="msg-text">{m.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row" style={{ marginTop: 8 }}>
        <input className="chat-input" value={text} onChange={e => setText(e.target.value)} placeholder="Напишите сообщение..." />
        <button className="btn btn-primary" onClick={send} disabled={!connection || connection.state !== "Connected"} style={{ padding: "8px 12px" }}>
          {(!connection || connection.state !== "Connected") ? "Отключено" : "Отправить"}
        </button>
      </div>
    </div>
  );
}
