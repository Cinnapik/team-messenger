import React, { useEffect, useState, useCallback } from "react";

export default function Kanban({ column = "todo" }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const parseTasks = (maybe) => {
    if (!maybe) return [];
    if (Array.isArray(maybe)) return maybe;
    if (Array.isArray(maybe.data)) return maybe.data;
    if (Array.isArray(maybe.items)) return maybe.items;
    return [];
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) {
        setError(`Server error ${res.status}`);
        setTasks([]);
        setLoading(false);
        return;
      }
      const body = await res.json().catch(() => null);
      setTasks(parseTasks(body));
    } catch (e) {
      setError(String(e?.message || e));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    window.fetchTasksGlobal = fetchTasks;
    return () => { if (window.fetchTasksGlobal === fetchTasks) delete window.fetchTasksGlobal; };
  }, [fetchTasks]);

  const update = async (id, status) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    await fetch(`/api/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...t, status }) });
    fetchTasks();
  };

  const remove = async (id) => { if (!confirm("Удалить задачу?")) return; await fetch(`/api/tasks/${id}`, { method: "DELETE" }); fetchTasks(); };

  const go = async (id) => {
    const r = await fetch(`/api/tasks/${id}/messages`);
    if (!r.ok) return alert("Нет сообщений");
    const msgs = await r.json().catch(() => []);
    if (!Array.isArray(msgs) || !msgs.length) return alert("Нет сообщений");
    const last = msgs[msgs.length - 1];
    window.scrollToMessageId = last.id ?? last.Id ?? null;
    alert("Переход к сообщению #" + (last.id ?? last.Id ?? "?"));
  };

  return (
    <div>
      {loading ? <div className="small">Загрузка задач...</div> : null}
      {error ? <div className="small" style={{ color: "var(--danger)" }}>Ошибка: {error}</div> : null}

      {Array.isArray(tasks) && tasks.filter(t => t.status === column).map(t => (
        <div key={t.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>{t.title}</strong>
            <div className="small">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}</div>
          </div>
          <div className="small">{t.description}</div>
          <div className="meta">
            <div className="progress" style={{ marginTop: 8 }}><i style={{ width: `${Math.min(100, (t.progress || 0))}%` }} /></div>
          </div>
          <div className="card-actions" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => update(t.id, "inprogress")}>В работу</button>
            <button className="btn" onClick={() => update(t.id, "done")}>Готово</button>
            <button className="btn btn-danger" onClick={() => remove(t.id)}>Удалить</button>
            <button className="btn" onClick={() => go(t.id)}>Перейти к сообщению</button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <button className="btn btn-primary" onClick={async () => {
          const title = prompt("Название задачи:");
          if (!title) return;
          const desc = prompt("Описание:") || "";
          try {
            const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description: desc, status: column }) });
            if (!res.ok) alert("Ошибка создания задачи");
            else fetchTasks();
          } catch {
            alert("Ошибка создания задачи");
          }
        }}>Создать задачу</button>
      </div>
    </div>
  );
}
