import React, { useEffect, useState } from "react";

/*
  client/src/Kanban.jsx
  - три колонки на русском
  - кнопки: В работу, Выполнено, Удалить
  - createTask -> status: "todo"
  - window.fetchTasksGlobal = fetchTasks
*/

export default function Kanban() {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = () => {
    fetch("http://localhost:5028/api/tasks")
      .then(r => r.json())
      .then(data => setTasks(data || []))
      .catch(err => console.error("Tasks fetch error:", err));
  };

  window.fetchTasksGlobal = fetchTasks;

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (id, status) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated = { ...task, status };
    await fetch(`http://localhost:5028/api/tasks/${id}`, {
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(updated)
    });
    fetchTasks();
  };

  const createTask = async (title, description) => {
    await fetch("http://localhost:5028/api/tasks", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ title, description, status:"todo" })
    });
    fetchTasks();
  };

  const columns = [
    { key: "todo", label: "К выполнению" },
    { key: "inprogress", label: "В работе" },
    { key: "done", label: "Выполнено" }
  ];

  return (
    <div className="panel kanban" style={{ height:"100%" }}>
      {columns.map(col => (
        <div key={col.key} className="kanban-column">
          <h4>{col.label}</h4>

          {tasks.filter(t => t.status === col.key).map(t => (
            <div key={t.id} className="task-card">
              <div className="task-title">{t.title}</div>
              <div className="task-desc">{t.description}</div>
              <div className="task-actions">
                {col.key !== "todo" && <button className="btn" onClick={() => updateStatus(t.id,"todo")}>К выполнению</button>}
                {col.key !== "inprogress" && <button className="btn" onClick={() => updateStatus(t.id,"inprogress")}>В работу</button>}
                {col.key !== "done" && <button className="btn" onClick={() => updateStatus(t.id,"done")}>Выполнено</button>}
                <button className="btn" style={{ marginLeft:"auto", background:"#dc3545", color:"#fff" }} onClick={async () => {
                  if (!confirm("Удалить задачу?")) return;
                  await fetch(`http://localhost:5028/api/tasks/${t.id}`, { method:"DELETE" });
                  fetchTasks();
                }}>Удалить</button>
              </div>
            </div>
          ))}

          <div style={{ marginTop:8 }}>
            <button className="btn btn-primary" style={{ padding:"8px 10px" }} onClick={() => {
              const title = prompt("Название задачи:");
              if (!title) return;
              const desc = prompt("Описание задачи:") || "";
              createTask(title, desc);
            }}>
              Создать задачу
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
