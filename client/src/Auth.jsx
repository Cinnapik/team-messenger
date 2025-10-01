import React, { useState } from "react";

export default function Auth({ onAuth }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1fb6ff");

  const submit = () => {
    if (!name.trim()) return alert("Введите имя");
    const user = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name: name.trim(), color };
    localStorage.setItem("tm_user", JSON.stringify(user));
    onAuth(user);
  };

  return (
    <div style={{ width:420 }}>
      <div className="panel">
        <h2 style={{ marginTop:0 }}>Вход</h2>
        <p className="small">Локальная авторизация. Имя и цвет сохраняются в localStorage.</p>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ваше имя" style={{ width:"100%",padding:10,borderRadius:8,border:"1px solid rgba(255,255,255,0.04)",marginBottom:8 }} />
        <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:8 }}>
          <label className="small">Цвет аватара</label>
          <input type="color" value={color} onChange={e=>setColor(e.target.value)} />
        </div>
        <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
          <button className="btn btn-primary" onClick={submit}>Войти</button>
        </div>
      </div>
    </div>
  );
}
