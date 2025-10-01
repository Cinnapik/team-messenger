import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

/*
  ChatTest.jsx
  - автоскролл
  - индикатор подключения
  - уменьшенные кнопки: Создать задачу, Помощник, Удалить
  - createTaskFromMessage: создаёт задачу и привязывает сообщение (через API)
  - SHOW_TASK_BUTTONS: флаг для скрытия/показа кнопок
  - подключение к SignalR по адресу http://localhost:5028/hubs/chat (замени порт если нужно)
*/

export default function ChatTest() {
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // Флаг: показать или скрыть кнопки у сообщений
  const SHOW_TASK_BUTTONS = true; // поставить false чтобы скрыть кнопки

  // Реф для автоскролла
  const messagesEndRef = React.useRef(null);

  // Загрузка истории при монтировании и подключение SignalR
  useEffect(() => {
    // Загрузить историю сообщений
    fetch("http://localhost:5028/api/messages")
      .then(res => res.json())
      .then(data => setMessages(data || []))
      .catch(err => console.error("History fetch error:", err));

    // Создать подключение SignalR
    const conn = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5028/hubs/chat")
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    conn.start()
      .then(() => console.log("SignalR connected"))
      .catch(err => console.error("SignalR start error:", err));

    // Обработчик входящих сообщений
    conn.on("ReceiveMessage", (user, message, createdAt, taskId) => {
      // Подстраиваемся под структуру сервера: если createdAt приходит в ISO
      setMessages(prev => [...prev, { id: null, user, text: message, createdAt, taskId }]);
    });

    setConnection(conn);

    // При размонтировании — остановить подключение
    return () => {
      conn.stop().catch(() => {});
    };
  }, []);

  // Автоскролл при обновлении messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Утилита подсказок помощника (rule-based)
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

  // Создать задачу из сообщения и привязать её к сообщению
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
      if (message.id) {
        // Привязка сообщения к задаче
        await fetch(`http://localhost:5028/api/messages/${message.id}/assignTask/${created.id}`, {
          method: "PATCH"
        });
      }
      alert("Задача создана и привязана к сообщению");
      if (window.fetchTasksGlobal) window.fetchTasksGlobal();
    } catch (err) {
      console.error(err);
      alert("Ошибка при создании задачи");
    }
  };

  // Отправка сообщения (с логированием и проверкой состояния подключения)
  const send = async () => {
    if (!text) return;
    if (!connection || connection.state !== "Connected") {
      console.error("SignalR: не подключён или неверное состояние", connection?.state);
      alert("Ошибка: не подключено к серверу. Проверьте сервер и перезапустите клиент.");
      return;
    }
    console.log("Invoking SendMessage:", text);
    try {
      // вызов SendMessage(user, message, taskId)
      await connection.invoke("SendMessage", "You", text, null);
      console.log("Invoke successful");
      setText("");
    } catch (err) {
      console.error("Invoke error:", err);
      alert("Ошибка при отправке сообщения: см. консоль");
    }
  };

  // Компактный стиль для кнопок
  const btnStyle = { padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "none", cursor: "pointer" };

  return (
    <div>
      <div style={{ marginBottom: 8, color: (!connection || connection.state !== "Connected") ? "#c00" : "#0a0" }}>
        {(!connection || connection.state !== "Connected") ? "Отключено" : "Подключено"}
      </div>

      <div style={{ border: "1px solid #ddd", padding: 10, height: 300, overflowY: "auto", marginBottom: 10, background: "#fff" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><b>{m.user}</b></div>
              <div style={{ color: "#666", fontSize: 12 }}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</div>
            </div>
            <div style={{ marginTop: 6 }}>{m.text}</div>

            {SHOW_TASK_BUTTONS && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  style={{ ...btnStyle, background: "#0b5cff", color: "#fff" }}
                  onClick={() => createTaskFromMessage(m)}
                >
                  Создать задачу
                </button>

                <button
                  style={{ ...btnStyle, background: "#6c757d", color: "#fff" }}
                  onClick={() => {
                    const suggestions = getSuggestions(m.text);
                    if (suggestions.length === 0) return alert("Нет предложений от помощника");
                    const s = suggestions[0];
                    if (confirm(`Помощник предлагает:\n${s.title}\n\nСоздать?`)) {
                      fetch("http://localhost:5028/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: s.title, description: s.description, status: "todo" })
                      }).then(() => {
                        alert("Задача создана");
                        if (window.fetchTasksGlobal) window.fetchTasksGlobal();
                      });
                    }
                  }}
                >
                  Помощник
                </button>

                <button
                  style={{ ...btnStyle, background: "#dc3545", color: "#fff" }}
                  onClick={async () => {
                    if (!confirm("Удалить сообщение?")) return;
                    // Удаление локально и на сервере (если есть id)
                    if (m.id) {
                      await fetch(`http://localhost:5028/api/messages/${m.id}`, { method: "DELETE" });
                      setMessages(prev => prev.filter(x => x.id !== m.id));
                    } else {
                      setMessages(prev => prev.filter(x => x !== m));
                    }
                    alert("Сообщение удалено");
                  }}
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Напишите сообщение..."
          style={{ flex: 1, padding: 8 }}
        />
        <button
          onClick={send}
          disabled={!connection || connection.state !== "Connected"}
          style={{ padding: "6px 12px" }}
        >
          {(!connection || connection.state !== "Connected") ? "Отключено" : "Отправить"}
        </button>
      </div>
    </div>
  );
}
