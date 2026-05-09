/// <reference types="chrome" />

import { useCallback, useEffect, useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    chrome.storage.local.get(
      ["sessions", "lastSavedAt"],
      (result: { sessions?: SavedSession[]; lastSavedAt?: string }) => {
        setSessions(result.sessions || []);

        if (result.lastSavedAt) {
          setLastSavedAt(
            new Date(result.lastSavedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })
          );
        }
      }
    );
  }, []);

  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;

      if (changes.sessions?.newValue) {
        setSessions(changes.sessions.newValue as SavedSession[]);
      }

      if (changes.lastSavedAt?.newValue) {
        const savedAt = changes.lastSavedAt.newValue as string;

        setLastSavedAt(
          new Date(savedAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        );
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const saveCurrentSession = useCallback(async (isAutoSave = false) => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const currentUrls = tabs.map((tab) => tab.url || "");

    chrome.storage.local.get(
      ["sessions"],
      (result: { sessions?: SavedSession[] }) => {
        const existingSessions = result.sessions || [];
        const latestSession = existingSessions[0];

        if (latestSession && isAutoSave) {
          const latestUrls = latestSession.tabs.map((tab) => tab.url);
          const isDuplicate =
            JSON.stringify(currentUrls) === JSON.stringify(latestUrls);

          if (isDuplicate) return;
        }

        const newSession: SavedSession = {
          id: crypto.randomUUID(),
          name: isAutoSave
            ? `Auto-save · ${new Date().toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}`
            : tabs
                .slice(0, 3)
                .map((tab) => tab.title?.split("|")[0]?.trim() || "Untitled")
                .join(", ") || "New Session",
          createdAt: new Date().toISOString(),
          tabs: tabs.map((tab: chrome.tabs.Tab) => ({
            id: crypto.randomUUID(),
            title: tab.title || "Untitled",
            url: tab.url || "",
            favIconUrl: tab.favIconUrl,
          })),
        };

        const updatedSessions = [newSession, ...existingSessions].slice(0, 25);

        chrome.storage.local.set(
          {
            sessions: updatedSessions,
            lastSavedAt: new Date().toISOString(),
          },
          () => {
            setSessions(updatedSessions);
            setLastSavedAt(
              new Date().toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })
            );
          }
        );
      }
    );
  }, []);

  const restoreSession = (session: SavedSession) => {
    session.tabs.forEach((tab) => {
      if (tab.url) {
        chrome.tabs.create({ url: tab.url });
      }
    });
  };

  const deleteSession = (sessionId: string) => {
    const updatedSessions = sessions.filter(
      (session) => session.id !== sessionId
    );

    chrome.storage.local.set({ sessions: updatedSessions }, () => {
      setSessions(updatedSessions);
    });
  };

  const renameSession = (sessionId: string) => {
    const newName = prompt("Rename this session:");

    if (!newName?.trim()) return;

    const updatedSessions = sessions.map((session) =>
      session.id === sessionId
        ? { ...session, name: newName.trim() }
        : session
    );

    chrome.storage.local.set({ sessions: updatedSessions }, () => {
      setSessions(updatedSessions);
    });
  };

  const clearAllSessions = () => {
    chrome.storage.local.set({ sessions: [] }, () => {
      setSessions([]);
      setLastSavedAt(null);
    });
  };

  const exportSessions = () => {
  const data = JSON.stringify(sessions, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `trace-sessions-${new Date().toISOString()}.json`;
  link.click();

  URL.revokeObjectURL(url);
};

  const filteredSessions = sessions.filter((session) => {
    const query = searchQuery.toLowerCase();

    return (
      session.name.toLowerCase().includes(query) ||
      session.tabs.some(
        (tab) =>
          tab.title.toLowerCase().includes(query) ||
          tab.url.toLowerCase().includes(query)
      )
    );
  });

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

      <button className="primaryButton" onClick={() => saveCurrentSession()}>
        Save Current Session
      </button>

      <p className="lastSaved">
        Auto-save is on ·{" "}
        {lastSavedAt
          ? `Last saved at ${lastSavedAt}`
          : "Waiting for first auto-save"}
      </p>

      <input
        className="searchInput"
        type="search"
        placeholder="Search saved tabs..."
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      {sessions.length > 0 && (
  <div className="utilityActions">
    <button className="secondaryButton" onClick={exportSessions}>
      Export Sessions
    </button>

    <button className="secondaryButton" onClick={clearAllSessions}>
      Clear All Sessions
    </button>
  </div>
)}

      <section className="sessions">
        <h2>Saved Sessions</h2>

        {sessions.length === 0 ? (
          <div className="emptyState">
            <div className="emptyIcon">✨</div>
            <h3>No sessions saved yet</h3>
            <p>
              Save your current tabs to create your first browser memory. Trace
              will help you recover the tabs and workflows you were using.
            </p>
            <button onClick={() => saveCurrentSession()}>
              Save First Session
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <p className="empty">No matching sessions found.</p>
        ) : (
          filteredSessions.map((session) => (
            <article className="sessionCard" key={session.id}>
              <div className="sessionHeader">
                <div>
                  <h3>{session.name}</h3>
                  <p>
                    {new Date(session.createdAt).toLocaleString()} ·{" "}
                    {session.tabs.length} tabs
                  </p>
                </div>

                <div className="sessionActions">
                  <button onClick={() => restoreSession(session)}>
                    Restore
                  </button>

                  <button onClick={() => renameSession(session.id)}>
                    Rename
                  </button>

                  <button
                    className="dangerButton"
                    onClick={() => deleteSession(session.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="tabList">
                {session.tabs.slice(0, 5).map((tab) => (
                  <button
                    className="tabItem"
                    key={tab.id}
                    onClick={() => chrome.tabs.create({ url: tab.url })}
                  >
                    {tab.favIconUrl ? (
                      <img src={tab.favIconUrl} alt="" />
                    ) : (
                      <span className="fallbackIcon">•</span>
                    )}
                    <span>{tab.title}</span>
                  </button>
                ))}

                {session.tabs.length > 5 && (
                  <p className="moreTabs">
                    +{session.tabs.length - 5} more tabs
                  </p>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default App;