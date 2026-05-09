/// <reference types="chrome" />
import { useEffect, useState } from "react";
import "./App.css";

type SavedTab = {
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
};

type SavedSession = {
  id: string;
  name: string;
  createdAt: string;
  tabs: SavedTab[];
};

function App() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
chrome.storage.local.get(["sessions"], (result: { sessions?: SavedSession[] }) => {
      setSessions(result.sessions || []);
    });
  }, []);

  const saveCurrentSession = async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    const newSession: SavedSession = {
      id: crypto.randomUUID(),
      name: `Session ${sessions.length + 1}`,
      createdAt: new Date().toISOString(),
      tabs: tabs.map((tab: chrome.tabs.Tab) => ({
        id: crypto.randomUUID(),
        title: tab.title || "Untitled",
        url: tab.url || "",
        favIconUrl: tab.favIconUrl,
      })),
    };

    const updatedSessions = [newSession, ...sessions];

    chrome.storage.local.set({ sessions: updatedSessions }, () => {
      setSessions(updatedSessions);
    });
  };

  const restoreSession = (session: SavedSession) => {
    session.tabs.forEach((tab) => {
      if (tab.url) {
        chrome.tabs.create({ url: tab.url });
      }
    });
  };

  return (
    <main className="app">
      <section className="header">
        <div>
          <p className="eyebrow">Trace</p>
          <h1>Browser Memory</h1>
        </div>
        <span className="badge">MVP</span>
      </section>

      <p className="subtitle">
        Save your current tabs and restore them when you lose your flow.
      </p>

      <button className="primaryButton" onClick={saveCurrentSession}>
        Save Current Session
      </button>

      <section className="sessions">
        <h2>Saved Sessions</h2>

        {sessions.length === 0 ? (
          <p className="empty">No sessions saved yet.</p>
        ) : (
          sessions.map((session) => (
            <article className="sessionCard" key={session.id}>
              <div>
                <h3>{session.name}</h3>
                <p>
                  {new Date(session.createdAt).toLocaleString()} ·{" "}
                  {session.tabs.length} tabs
                </p>
              </div>

              <button onClick={() => restoreSession(session)}>Restore</button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default App;