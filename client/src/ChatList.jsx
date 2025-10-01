import React from "react";

const CHATS = [
  { id: "general", name: "General", avatar: "G", last: "Новый чат создан" },
  { id: "backend", name: "Backend", avatar: "B", last: "" },
  { id: "design", name: "Design", avatar: "D", last: "" },
  { id: "random", name: "Random", avatar: "R", last: "" }
];

export default function ChatList({ current, onSelect }) {
  return (
    <div className="chat-list">
      {CHATS.map(c => (
        <div key={c.id} className={"chat-item" + (current === c.id ? " active" : "")} onClick={() => onSelect(c.id)}>
          <div className="avatar">{c.avatar}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="chat-name">{c.name}</div>
              <div className="small"></div>
            </div>
            <div className="chat-snippet">{c.last || "Пустой чат — начни переписку"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
