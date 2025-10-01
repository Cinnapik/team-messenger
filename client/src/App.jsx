import React from "react";
import ChatTest from "./ChatTest";
import Kanban from "./Kanban";
import "./styles.css"; // импорт тёмной темы

export default function App(){
  return (
    <div className="app-grid">
      <div style={{ display:"flex", flexDirection:"column" }}>
        <div style={{ marginBottom:12 }}>
          <h2 style={{ margin:0, color:"#fff" }}>Team Messenger — чат</h2>
          <div style={{ color:"#9aa3b2", fontSize:13 }}>Локальная разработка — сервер + клиент</div>
        </div>
        <ChatTest />
      </div>

      <div>
        <div style={{ marginBottom:12 }}>
          <h2 style={{ margin:0, color:"#fff" }}>Задачи</h2>
          <div style={{ color:"#9aa3b2", fontSize:13 }}>Kanban</div>
        </div>
        <Kanban />
      </div>
    </div>
  );
}
