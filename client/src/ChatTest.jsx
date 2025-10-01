import React, { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const DEFAULT_USERS = [
  { id: "you", name: "You", avatar: "Y" },
  { id: "lina", name: "Lina", avatar: "L" },
  { id: "global", name: "Global", avatar: "G" }
];

function IconDots() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" fill="currentColor"/></svg>);
}
function IconTask() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 11l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>);
}

export default function ChatTest() {
  const [connection, setConnection] = useState(null);
  const [users] = useState(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState(DEFAULT_USERS[0].id);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // load messages
    fetch("http://localhost:5028/api/messages")
      .then(r => r.json())
      .then(data => setMessages(data || []))
      .catch(() => setMessages([]));

    // SignalR connect
    const conn = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5028/hubs/chat")
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    conn.start().then(() => console.log("SignalR connected")).catch(err => console.error("SignalR start Failed:", err));

    conn.on("ReceiveMessage", (msg) => {
      setMessages(prev => [...prev, normalize(msg)]);
      inputRef.current?.focus();
    });

    conn.on("MessageUpdated", (msg) => {
      setMessages(prev => prev.map(m => m.id === msg.id ? normalize(msg) : m));
    });

    setConnection(conn);

    // simulate small delay loading users (keeps UI stable)
    setTimeout(()=> setLoadingUsers(false), 120);

    return () => { conn.stop().catch(()=>{}); };
  }, []);

  function normalize(msg) {
    return {
      id: msg.id ?? msg.Id ?? null,
      user: msg.user ?? msg.User ?? "Unknown",
      text: msg.text ?? msg.Text ?? "",
      createdAt: msg.createdAt ?? msg.CreatedAt ?? new Date().toISOString(),
      taskId: msg.taskId ?? msg.TaskId ?? null
    };
  }

  // autoscroll to bottom on messages change
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text) return;
    if (!connection || connection.state !== "Connected") {
      alert("Не подключено к серверу");
      return;
    }
    try {
      await connection.invoke("SendMessage", users.find(u => u.id === currentUser).name, text, null);
      setText("");
      inputRef.current?.focus();
    } catch (e) {
      console.error("Send error", e);
      alert("Ошибка при отправке");
    }
  };

  const createTaskFromMessage = async (message) => {
    const title = prompt("Название задачи:", (message.text || "").slice(0, 50));
    if (!title) return;
    const desc = prompt("Описание задачи:", message.text || "") || "";
    try {
      const r = await fetch("http://localhost:5028/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc, status: "todo" })
      });
      const created = await r.json();
      if (message.id) await fetch(`http://localhost:5028/api/messages/${message.id}/assignTask/${created.id}`, { method: "PATCH" });
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, taskId: created.id } : m));
      if (window.fetchTasksGlobal) window.fetchTasksGlobal();
      alert("Задача создана");
    } catch (e) {
      console.error(e);
      alert("Ошибка");
    }
  };

  const deleteMessage = async (message) => {
    if (!confirm("Удалить сообщение?")) return;
    if (message.id) await fetch(`http://localhost:5028/api/messages/${message.id}`, { method: "DELETE" });
    setMessages(prev => prev.filter(m => m.id !== message.id));
    setOpenMenuIndex(null);
  };

  return (
    <div style={{ display: "flex", gap: 12, height: "100%" }}>
      <div className="users-column panel">
        <div style={{ marginBottom: 8 }}>
          <div className="small">Пользователи</div>
        </div>
        <div className="users-list">
          {loadingUsers ? <div className="small">Загрузка...</div> : users.map(u => (
            <div key={u.id} className={"user-row" + (currentUser === u.id ? " active" : "")} onClick={() => setCurrentUser(u.id)}>
              <div className="user-avatar">{u.avatar}</div>
              <div>
                <div className="user-name">{u.name}</div>
                <div className="user-meta">{currentUser === u.id ? "Вы" : "Нажмите, чтобы выбрать"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="col-chat" style={{ display: "flex", flexDirection: "column" }}>
        <div className="chat-top">
          <div>
            <div style={{ fontWeight: 700 }}>{users.find(u => u.id === currentUser).name}</div>
            <div className="small">Пиши от имени выбранного пользователя</div>
          </div>
          <div className="small">{connection && connection.state === "Connected" ? "Подключено" : "Отключено"}</div>
        </div>

        <div className="chat-area">
          <div className="msg-scroll" ref={listRef}>
            <div className="msg-list" role="list">
              {messages.map((m, i) => (
                <div className="msg" key={m.id ?? i} data-message-id={m.id ?? ""}>
                  <div className="msg-avatar">{(m.user || "U").slice(0, 1).toUpperCase()}</div>

                  <div style={{ flex: 1 }}>
                    <div className="msg-body">
                      <div className="msg-header">
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div className="msg-user">{m.user}</div>
                          <div className="msg-time">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</div>
                        </div>

                        <div>
                          <button className="icon-btn" onClick={() => setOpenMenuIndex(openMenuIndex === i ? null : i)} title="Действия">
                            <IconDots />
                          </button>
                        </div>
                      </div>

                      <div className="msg-text">{m.text}</div>
                      {m.taskId ? <div className="msg-tag"><IconTask /> Задача #{m.taskId}</div> : null}
                    </div>

                    {openMenuIndex === i && (
                      <div className="context-menu" onMouseLeave={() => setOpenMenuIndex(null)}>
                        <button onClick={() => { createTaskFromMessage(m); setOpenMenuIndex(null); }}>Создать задачу</button>
                        <button onClick={() => { alert("Помощник: предложений нет"); setOpenMenuIndex(null); }}>Помощник</button>
                        <button onClick={() => { deleteMessage(m); setOpenMenuIndex(null); }} style={{ color: "var(--danger)" }}>Удалить</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-input-bar">
            <input ref={inputRef} className="chat-input" placeholder="Напишите сообщение..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="send-btn" onClick={send}>Отправить</button>
          </div>
        </div>
      </div>
    </div>
  );
}
