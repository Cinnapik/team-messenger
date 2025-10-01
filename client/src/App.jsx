import React from "react";
import ChatTest from "./ChatTest";
import Kanban from "./Kanban";

export default function App() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 20, padding: 20 }}>
      <div>
        <h2>Team Messenger — чат</h2>
        <ChatTest />
      </div>
      <div>
        <h2>Задачи</h2>
        <Kanban />
      </div>
    </div>
  );
}
