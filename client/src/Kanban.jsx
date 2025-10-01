import React, { useEffect, useState, useCallback } from "react";

export default function Kanban({ column = "todo", compact = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async ()=> {
    setLoading(true);
    try {
      const r = await fetch("/api/tasks");
      if(!r.ok){ setTasks([]); setLoading(false); return; }
      const data = await r.json().catch(()=>[]);
      setTasks(Array.isArray(data)?data:[]);
    } catch { setTasks([]); } finally { setLoading(false); }
  },[]);

  useEffect(()=>{ fetchTasks(); window.fetchTasksGlobal = fetchTasks; },[fetchTasks]);

  if(loading) return <div className="small">Загрузка...</div>;

  const list = tasks.filter(t => (t.status||"todo") === column);
  if(list.length === 0) return <div className="small">Пусто</div>;

  return (
    <div className={compact ? "k-compact" : ""}>
      {list.map(t => (
        <div key={t.id} className="k-card" style={{ marginBottom: 8 }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:700}}>{t.title}</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}</div>
          </div>
          <div style={{color:"var(--muted)",fontSize:13}}>{t.description}</div>
          <div className="k-actions" style={{marginTop:8}}>
            <button onClick={async ()=>{ await fetch(`/api/tasks/${t.id}`,{ method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ ...t, status: "inprogress" }) }); fetchTasks(); }}>В работу</button>
            <button onClick={async ()=>{ await fetch(`/api/tasks/${t.id}`,{ method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ ...t, status: "done" }) }); fetchTasks(); }}>Готово</button>
            <button onClick={async ()=>{ if(!confirm("Удалить задачу?")) return; await fetch(`/api/tasks/${t.id}`,{ method:"DELETE" }); fetchTasks(); }}>Удалить</button>
          </div>
        </div>
      ))}
    </div>
  );
}
