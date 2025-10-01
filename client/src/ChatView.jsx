import React, { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";

const LAST_N = 200;

export default function ChatView({ chatId = "general", user, onOpenChatInfo }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [ctxMenu, setCtxMenu] = useState(null);
  const listRef = useRef(null);

  const normalize = useCallback((r) => ({
    id: r?.id ?? r?.Id,
    user: r?.user ?? r?.User,
    text: r?.text ?? r?.Text,
    createdAt: r?.createdAt ?? r?.CreatedAt ?? new Date().toISOString(),
    chatId: r?.chatId ?? r?.ChatId ?? chatId,
    taskId: r?.taskId ?? r?.TaskId ?? null,
  }), [chatId]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?chatId=${encodeURIComponent(chatId)}&limit=${LAST_N}`);
        if (!res.ok) { setMessages([]); return; }
        const data = await res.json().catch(() => []);
        const arr = Array.isArray(data) ? data.map(normalize) : [];
        const sorted = arr.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
        setMessages(sorted.slice(-LAST_N));
      } catch { setMessages([]); }
    };
    fetchMessages();
    window.fetchMessagesGlobal = fetchMessages;
  }, [chatId, normalize]);

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder().withUrl("/hubs/chat").withAutomaticReconnect().configureLogging(signalR.LogLevel.Error).build();
    window._tm_conn = conn;
    conn.start().catch(()=>{});
    conn.on("ReceiveMessage", (msg) => {
      if (!msg) return;
      if (msg.chatId && String(msg.chatId) !== String(chatId)) return;
      setMessages(prev => {
        const next = [...prev, normalize(msg)];
        return next.slice(-LAST_N);
      });
    });
    conn.on("MessageUpdated", (msg) => {
      if (!msg) return;
      const u = normalize(msg);
      setMessages(prev => prev.map(m => m.id === u.id ? u : m));
    });
    return () => { conn.stop().catch(()=>{}); window._tm_conn = null; };
  }, [chatId, normalize]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text) return;
    const saved = localStorage.getItem("tm_user"); if (!saved) return alert("Войдите");
    const userObj = JSON.parse(saved);
    try {
      const conn = window._tm_conn;
      if (conn && conn.invoke) await conn.invoke("SendMessage", userObj.name, text, null, chatId);
      else await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: userObj.name, text, chatId }) });
      setText("");
      if (window.fetchMessagesGlobal) window.fetchMessagesGlobal();
    } catch { alert("Ошибка отправки"); }
  };

  const onContext = (e, msg) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, msg });
  };

  const closeCtx = () => setCtxMenu(null);

  const assignTask = async (m) => {
    const title = prompt("Название задачи:", (m.text||"").slice(0,70)); if (!title) return;
    const r = await fetch("/api/tasks",{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ title, description: m.text, status: "todo" }) });
    if (!r.ok) return alert("Ошибка");
    const created = await r.json();
    if (m.id) await fetch(`/api/messages/${m.id}/assignTask/${created.id}`,{ method:"PATCH" });
    closeCtx();
    if (window.fetchTasksGlobal) window.fetchTasksGlobal();
  };

  const deleteMsg = async (m) => {
    if (!confirm("Удалить сообщение?")) return;
    await fetch(`/api/messages/${m.id}`,{ method:"DELETE" });
    setMessages(prev=>prev.filter(x=>x.id!==m.id));
    closeCtx();
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}} onClick={closeCtx}>
      <div className="chat-header">
        <div>
          <div className="chat-title" onClick={() => { if (onOpenChatInfo) onOpenChatInfo(); }} style={{cursor:"pointer"}}>Чат: {chatId}</div>
        </div>
        <div style={{fontSize:13,color:"var(--muted)"}}>{Array.isArray(messages) ? messages.length : 0} сообщений</div>
      </div>

      <div className="messages-area" ref={listRef}>
        {messages.map((m,i)=>(
          <div key={m.id ?? i} className={"msg"+(m.user===user.name?" me":"")} onContextMenu={(e)=>onContext(e,m)}>
            <div className="msg-avatar" style={{background: m.user===user.name ? (user.color||"#0db0ff") : "linear-gradient(135deg,var(--accent),var(--accent-2))"}}>{(m.user||"U").slice(0,1).toUpperCase()}</div>
            <div style={{minWidth:0,flex:1}}>
              <div className={"bubble"+(m.user===user.name?" me":"")}>
                <div className="meta">
                  <div className="user">{m.user}</div>
                  <div className="time">{new Date(m.createdAt).toLocaleString()}</div>
                </div>
                <div className="text">{m.text}</div>
                {m.taskId ? <div className="task-badge">Задача #{m.taskId}</div> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="composer-row">
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Напишите сообщение..." onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }}} />
        <button onClick={send}>Отправить</button>
      </div>

      {ctxMenu ? (
        <div className="context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          <button onClick={() => assignTask(ctxMenu.msg)}>Создать задачу из сообщения</button>
          <button onClick={() => { navigator.clipboard?.writeText(ctxMenu.msg.text); closeCtx(); alert("Скопировано"); }}>Копировать</button>
          <button onClick={() => deleteMsg(ctxMenu.msg)}>Удалить</button>
          <button onClick={closeCtx}>Закрыть</button>
        </div>
      ) : null}
    </div>
  );
}
