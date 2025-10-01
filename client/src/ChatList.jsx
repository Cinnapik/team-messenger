import React from "react";

const CHATS = [
  { id: "general", name: "General", avatar: "G", last: "Просто чат ни о чём", participants: ["Антон","Мария","Иван"] },
  { id: "backend", name: "Backend", avatar: "B", last: "Обсуждение API", participants: ["Бекенд","Саша"] },
  { id: "design", name: "Design", avatar: "D", last: "Обсуждение дизайна", participants: ["Дизайн"] },
  { id: "random", name: "Random", avatar: "R", last: "Пустые разговоры", participants: ["Рандом"] }
];

export default function ChatList({ current, onSelect, search = "" }) {
  const q = search.trim().toLowerCase();
  const filtered = CHATS.filter(c => {
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.last.toLowerCase().includes(q) || c.participants.join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="chat-list">
      {filtered.map(c => (
        <div key={c.id} className={"chat-item" + (current === c.id ? " active" : "")} onClick={() => onSelect(c.id)}>
          <div className="avatar">{c.avatar}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="chat-name">{c.name}</div>
              <div className="chat-count">{c.participants.length} участника</div>
            </div>
            <div className="chat-snippet">{c.last}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
