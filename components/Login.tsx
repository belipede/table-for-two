"use client";
import { useState } from "react";

export default function Login() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: code }),
    });
    if (res.ok) location.reload();
    else {
      setErr((await res.json()).error ?? "Nope");
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form onSubmit={submit} className="login-card">
        <div className="login-emoji">🍜💕</div>
        <h1>Table for Two</h1>
        <p>Just for us. What's our secret word?</p>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="secret word"
          autoFocus
        />
        {err && <div className="err">{err}</div>}
        <button className="btn primary" disabled={busy || !code}>
          {busy ? "Checking…" : "Let us in"}
        </button>
      </form>
    </main>
  );
}
