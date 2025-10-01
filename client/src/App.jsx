import React, { useEffect, useState } from "react";
import ChatList from "./ChatList";
import ChatView from "./ChatView";
import Kanban from "./Kanban";
import Auth from "./Auth";
import "./styles.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentChat, setCurrentChat] = useState("general");
  const [filter, setFilter] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatInfoOpen, setChatInfoOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tm_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse saved user", err);
        localStorage.removeItem("tm_user");
      }
    }
  }, []);

  useEffect(() => {
    window.currentChat = currentChat;
  }, [currentChat]);

  if (!user)
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Auth
          onAuth={(u) => {
            setUser(u);
            try {
              localStorage.setItem("tm_user", JSON.stringify(u));
            } catch (err) {
              console.error("Failed to save user", err);
            }
          }}
        />
      </div>
    );

  const openChatInfo = () => setChatInfoOpen(true);

  return (
    <div className="app">
      <div className="shell">
        <div className="col-profile">
          <div className="profile-block">
            <div
              className="profile-avatar"
              title={user.name}
              onClick={() => {
                setProfileOpen((p) => !p);
              }}
            >
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="profile-name">{user.name}</div>
          </div>
        </div>

        <div className="col-chats">
          <div className="chats-panel">
            <div className="search">
              <input placeholder="Поиск чатов и задач..." value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            <div className="chat-list" style={{ marginTop: 8 }}>
              <ChatList current={currentChat} onSelect={setCurrentChat} search={filter} />
            </div>
          </div>
        </div>

        <div className="chat-center">
          <div className="chat-center panel" style={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}>
            <ChatView chatId={currentChat} user={user} onOpenChatInfo={openChatInfo} />
          </div>
        </div>

        <div className="col-tasks">
          <div className="assistant">
            <strong>Помощник кода</strong>
            <div style={{ color: "var(--muted)", marginTop: 8 }}>Быстрые подсказки и сниппеты</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => alert("Сниппет (заглушка)")}>Сниппет</button>
              <button onClick={() => alert("Формат (заглушка)")}>Формат</button>
              <button onClick={() => alert("Анализ (заглушка)")}>Анализ</button>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <strong>Задачи</strong>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>Сводка</div>
              </div>
              <button
                onClick={async () => {
                  const title = prompt("Название задачи:");
                  if (!title) return;
                  try {
                    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description: "", status: "todo" }) });
                    if (!res.ok) throw new Error("server");
                    if (window.fetchTasksGlobal) window.fetchTasksGlobal();
                  } catch (err) {
                    console.error("Create task failed", err);
                    alert("Ошибка создания задачи");
                  }
                }}
              >
                ＋
              </button>
            </div>

            <div className="tasks-list">
              <Kanban column="todo" compact />
              <div style={{ marginTop: 10 }}>
                <strong>В работе</strong>
              </div>
              <Kanban column="inprogress" compact />
            </div>
          </div>
        </div>
      </div>

      <div className={profileOpen ? "profile-panel open" : "profile-panel"} onClick={() => setProfileOpen(false)}>
        <div className="header">
          <h3 style={{ margin: 0 }}>{user.name}</h3>
          <div style={{ color: "var(--muted)" }}>Профиль и настройки</div>
        </div>
        <div
          className="body"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{user.name}</div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>Информация профиля</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <div>Цвет аватара</div>
            <input
              type="color"
              defaultValue={user.color || "#0db0ff"}
              onChange={(e) => {
                try {
                  const u = JSON.parse(localStorage.getItem("tm_user") || "{}");
                  u.color = e.target.value;
                  localStorage.setItem("tm_user", JSON.stringify(u));
                  window.location.reload();
                } catch (err) {
                  console.error("Failed to update avatar color", err);
                }
              }}
            />
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                localStorage.removeItem("tm_user");
                window.location.reload();
              }}
            >
              Выйти
            </button>
            <button onClick={() => setProfileOpen(false)}>Закрыть</button>
          </div>
        </div>
      </div>

      <div className={chatInfoOpen ? "chat-info open" : "chat-info"} onClick={() => setChatInfoOpen(false)}>
        <div className="header">
          <h3 style={{ margin: 0 }}>Информация — {currentChat}</h3>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>Файлы, фото и участники</div>
        </div>
        <div
          className="body"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div style={{ fontWeight: 700 }}>Участники</div>
          <div style={{ color: "var(--muted)" }}>Антон, Мария, Иван, София</div>

          <div style={{ marginTop: 12, fontWeight: 700 }}>Файлы</div>
          <div style={{ color: "var(--muted)" }}>Нет файлов (заглушка)</div>

          <div style={{ marginTop: 12 }}>
            <button onClick={() => alert("Скачать архив файлов (заглушка)")}>Скачать всё</button>
          </div>
        </div>
      </div>
    </div>
  );
}
