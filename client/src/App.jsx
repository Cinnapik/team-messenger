import React, { useEffect, useState } from "react";
import ChatList from "./ChatList";
import ChatView from "./ChatView";
import Kanban from "./Kanban";
import Auth from "./Auth";
import "./styles.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentChat, setCurrentChat] = useState("general");

  useEffect(() => {
    const saved = localStorage.getItem("tm_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  if (!user) return <div className="app" style={{ alignItems: "center" }}><Auth onAuth={u => { setUser(u); localStorage.setItem("tm_user", JSON.stringify(u)); }} /></div>;

  return (
    <div className="app">
      <div className="container">
        <div className="left panel">
          <div className="header"><div><div className="title">Чаты</div><div className="small">Реалистичный мессенджер</div></div><div style={{display:"flex",alignItems:"center",gap:8}} className="small">Вы: <strong>{user.name}</strong><button className="btn" onClick={()=>{ localStorage.removeItem("tm_user"); window.location.reload(); }}>Выйти</button></div></div>
          <ChatList current={currentChat} onSelect={setCurrentChat} />
        </div>

        <div className="mid panel" style={{ padding: 0 }}>
          <ChatView chatId={currentChat} user={user} />
        </div>

        <div className="right panel">
          <div className="kanban-title"><div className="title">Задачи</div><div className="small">Управление задачами</div></div>
          <div className="columns">
            <div className="col"><h4>Новые</h4><Kanban column="todo" /></div>
            <div className="col"><h4>В работе</h4><Kanban column="inprogress" /></div>
            <div className="col"><h4>Выполнено</h4><Kanban column="done" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
