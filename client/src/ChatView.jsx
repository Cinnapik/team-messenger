import React, { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";

export default function ChatView({ chatId = "general", user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [conn, setConn] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [retry, setRetry] = useState(0);
  const [context, setContext] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const normalize = useCallback(
    (raw) => ({
      id: raw?.id ?? raw?.Id,
      user: raw?.user ?? raw?.User,
      text: raw?.text ?? raw?.Text,
      createdAt: raw?.createdAt ?? raw?.CreatedAt ?? new Date().toISOString(),
      chatId: raw?.chatId ?? raw?.ChatId ?? chatId,
      taskId: raw?.taskId ?? raw?.TaskId ?? null,
    }),
    [chatId]
  );

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/messages?chatId=${encodeURIComponent(chatId)}`);
        if (!res.ok) { setMessages([]); return; }
        const body = await res.json().catch(() => null);
        const arr = Array.isArray(body) ? body.map(normalize) : [];
        setMessages(arr);

        // если кто-то вызвал переход к сообщению — прокрутить после загрузки
        setTimeout(() => {
          const gotoId = window.scrollToMessageId;
          if (gotoId) {
            const el = document.getElementById(`msg-${gotoId}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            window.scrollToMessageId = null;
          }
        }, 120);
      } catch {
        setMessages([]);
      }
    };
    loadHistory();
  }, [chatId, normalize, retry]);

  useEffect(() => {
    let stopped = false;
    let connection = null;
    const backoffSeconds = Math.min(30, Math.pow(2, Math.min(6, retry)));

    const start = async () => {
      setStatus("connecting");
      connection = new signalR.HubConnectionBuilder()
        .withUrl("/hubs/chat")
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Error)
        .build();

      connection.onclose(() => {
        if (stopped) return;
        setStatus("disconnected");
        setTimeout(() => setRetry((r) => r + 1), backoffSeconds * 1000);
      });

      connection.on("ReceiveMessage", (msg) => {
        try {
          if (!msg) return;
          if (msg.chatId && String(msg.chatId) !== String(chatId)) return;
          setMessages((prev) => [...prev, normalize(msg)]);
          inputRef.current?.focus();
        } catch (ex) { console.warn(ex); }
      });

      connection.on("MessageUpdated", (payload) => {
        try {
          if (Array.isArray(payload)) {
            const updated = payload.map(normalize);
            setMessages((prev) => prev.map((x) => updated.find((u) => u.id === x.id) ?? x));
          } else {
            const updated = normalize(payload);
            setMessages((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
          }
        } catch (ex) { console.warn(ex); }
      });

      connection.on("TasksUpdated", () => {
        if (window.fetchTasksGlobal) window.fetchTasksGlobal();
      });

      try {
        await connection.start();
        if (stopped) { connection.stop().catch(() => {}); return; }
        setConn(connection);
        setStatus("connected");
        setRetry(0);
      } catch {
        setStatus("disconnected");
        setTimeout(() => setRetry((r) => r + 1), backoffSeconds * 1000);
      }
    };

    start();

    return () => {
      stopped = true;
      if (connection) connection.stop().catch(() => {});
      setConn(null);
      setStatus("disconnected");
    };
  }, [chatId, normalize, retry]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text) return;
    if (!conn || conn.state !== "Connected") { alert("Нет соединения с сервером"); return; }
    try {
      await conn.invoke("SendMessage", user.name, text, null, chatId);
      setText("");
      inputRef.current?.focus();
    } catch (ex) { console.error("Send error", ex); alert("Ошибка отправки"); }
  };

  const onMessageContext = (index, e) => {
    e.preventDefault();
    setContext({ index, x: e.clientX, y: e.clientY });
  };

  const closeContext = () => setContext(null);

  const deleteMsg = async (m) => {
    if (!confirm("Удалить?")) return;
    await fetch(`/api/messages/${m.id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    setContext(null);
  };

  const createTaskFrom = async (m) => {
    const title = prompt("Название задачи:", (m.text || "").slice(0, 60));
    if (!title) return;
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description: m.text, status: "todo" }) });
    if (!res.ok) { alert("Ошибка создания задачи"); setContext(null); return; }
    const created = await res.json().catch(() => null);

    // persist relation on server
    if (created && m.id) {
      await fetch(`/api/messages/${m.id}/assignTask/${created.id}`, { method: "PATCH" });
    }

    setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, taskId: created?.id ?? x.taskId } : x));
    if (window.fetchTasksGlobal) window.fetchTasksGlobal();
    setContext(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="chat-header">
        <div><div style={{ fontWeight: 700 }}>Chat: {chatId}</div><div className="small">Участники: You, Lina, Global</div></div>
        <div className="small" style={{ textTransform: "uppercase" }}>{status === "connected" ? <span style={{ color: "var(--accent)" }}>Online</span> : status === "connecting" ? <span>Connecting...</span> : <span style={{ color: "var(--danger)" }}>Offline</span>}</div>
      </div>

      <div className="chat-area">
        <div className="messages-wrap" ref={listRef}>
          {messages.map((msg, i) => (
            <div id={`msg-${msg.id ?? i}`} key={msg.id ?? i} className={"msg" + (msg.user === user.name ? " me" : "")} onContextMenu={(e) => onMessageContext(i, e)}>
              <div className="msg-avatar" style={{ background: msg.user === user.name ? user.color : undefined }}>{(msg.user || "U").slice(0, 1).toUpperCase()}</div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div className={"bubble" + (msg.user === user.name ? " me" : "")}>
                  <div className="meta">
                    <div className="user">{msg.user}</div>
                    <div className="time">{new Date(msg.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="text">{msg.text}</div>
                  {msg.taskId ? <div style={{ marginTop: 8 }} className="card"><strong>Задача #{msg.taskId}</strong></div> : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        {context && (
          <div className="context-menu" style={{ left: context.x ?? undefined, top: context.y ?? undefined, right: context.x ? undefined : 12 }}>
            <button onClick={() => createTaskFrom(messages[context.index])}>Создать задачу</button>
            <button onClick={() => deleteMsg(messages[context.index])} style={{ color: "var(--danger)" }}>Удалить</button>
            <button onClick={closeContext}>Закрыть</button>
          </div>
        )}

        <div className="input-bar">
          <input ref={inputRef} className="input" placeholder="Напишите сообщение..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="send" onClick={send} disabled={status !== "connected"}>Отправить</button>
        </div>
      </div>
    </div>
  );
}
