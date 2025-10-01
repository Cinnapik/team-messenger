import React, { useEffect, useState } from "react";

/*
  Kanban.jsx
  - три колонки: К выполнению, В работе, Выполнено
  - createTask отправляет status: "todo"
  - updateStatus меняет статус через PUT
  - удаление задачи через DELETE
  - экспорт window.fetchTasksGlobal = fetchTasks для обновления извне
*/

export default function Kanban() {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = () => {
    fetch("http://localhost:5028/api/tasks")
      .then(r => r.json())
      .then(data => setTasks(data || []))
      .catch(err => console.error("Tasks fetch error:", err));
  };

  // экспортируем функцию обновления для использования из ChatTest
  window.fetchTasksGlobal = fetchTasks;

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateStatus = async (id, status) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated = { ...task, status };
    await fetch(`http://localhost:5028/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    fetchTasks();
  };

  const createTask = async (title, description) => {
    const res = await fetch("http://localhost:5028/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, status: "todo" })
    });
    if (res.ok) fetchTasks();
  };

  const columns = [
    { key: "todo", label: "К выполнению" },
    { key: "inprogress", label: "В работе" },
    { key: "done", label: "Выполнено" }
  ];

  return (
    <div style={{ display: "flex", gap: 12 }}>
      {columns.map(col => (
        <div key={col.key} style={{ flex: 1, border: "1px solid #ddd", padding: 8, background: "#fff" }}>
          <h4>{col.label}</h4>

          {tasks.filter(t => t.status === col.key).map(t => (
            <div key={t.id} style={{ border: "1px solid #ccc", margin: 6, padding: 8, borderRadius: 6, background: "#f9f9f9" }}>
              <div style={{ fontWeight: "bold" }}>{t.title}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{t.description}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                {col.key !== "todo" && <button onClick={() => updateStatus(t.id, "todo")}>К выполнению</button>}
                {col.key !== "inprogress" && <button onClick={() => updateStatus(t.id, "inprogress")}>В работу</button>}
                {col.key !== "done" && <button onClick={() => updateStatus(t.id, "done")}>Выполнено</button>}

                <button
                  style={{ marginLeft: "auto", background: "#dc3545", color: "#fff", padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer" }}
                  onClick={async () => {
                    if (!confirm("Удалить задачу?")) return;
                    await fetch(`http://localhost:5028/api/tasks/${t.id}`, { method: "DELETE" });
                    fetchTasks();
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => {
                const title = prompt("Название задачи:");
                if (!title) return;
                const desc = prompt("Описание задачи:") || "";
                createTask(title, desc);
              }}
              style={{ padding: "6px 10px", borderRadius: 6, background: "#0b5cff", color: "#fff", border: "none", cursor: "pointer" }}
            >
              Создать задачу
            </button>
          </div>
          
        </div>
      ))}
    </div>
  );
}
