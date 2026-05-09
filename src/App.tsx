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
  isPinned?: boolean;
  tag?: string;
  summary?: string;
};

function App() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>([]);
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
          name:
            tabs
              .slice(0, 3)
              .map((tab) => tab.title?.split("|")[0]?.trim() || "Untitled")
              .join(", ") || "Auto-save",
          summary: tabs
            .slice(0, 3)
            .map((tab) => tab.title?.split("|")[0]?.trim())
            .filter(Boolean)
            .join(" • "),
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
    const urls = session.tabs.map((tab) => tab.url).filter(Boolean);

    if (urls.length === 0) return;

    chrome.windows.create({ url: urls });
  };

  const copySessionLinks = async (session: SavedSession) => {
    const links = session.tabs
      .map((tab) => `${tab.title}\n${tab.url}`)
      .join("\n\n");

    await navigator.clipboard.writeText(links);
    alert("Session links copied!");
  };

  const deleteSession = (sessionId: string) => {
    const confirmed = confirm("Delete this saved session?");

    if (!confirmed) return;

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

  const editSessionSummary = (sessionId: string) => {
    const sessionToEdit = sessions.find((session) => session.id === sessionId);

    const newSummary = prompt(
      "Edit this session summary:",
      sessionToEdit?.summary || ""
    );

    if (newSummary === null) return;

    const updatedSessions = sessions.map((session) =>
      session.id === sessionId
        ? { ...session, summary: newSummary.trim() }
        : session
    );

    chrome.storage.local.set({ sessions: updatedSessions }, () => {
      setSessions(updatedSessions);
    });
  };

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessionIds((currentIds) =>
      currentIds.includes(sessionId)
        ? currentIds.filter((id) => id !== sessionId)
        : [...currentIds, sessionId]
    );
  };

  const togglePinSession = (sessionId: string) => {
    const updatedSessions = sessions.map((session) =>
      session.id === sessionId
        ? { ...session, isPinned: !session.isPinned }
        : session
    );

    chrome.storage.local.set({ sessions: updatedSessions }, () => {
      setSessions(updatedSessions);
    });
  };

  const tagSession = (sessionId: string) => {
    const newTag = prompt("Add a tag/category for this session:");

    if (!newTag?.trim()) return;

    const updatedSessions = sessions.map((session) =>
      session.id === sessionId
        ? { ...session, tag: newTag.trim() }
        : session
    );

    chrome.storage.local.set({ sessions: updatedSessions }, () => {
      setSessions(updatedSessions);
    });
  };

  const clearAllSessions = () => {
    const confirmed = confirm(
      "Clear all saved sessions? This cannot be undone."
    );

    if (!confirmed) return;

    chrome.storage.local.set({ sessions: [], lastSavedAt: null }, () => {
      setSessions([]);
      setLastSavedAt(null);
      setSelectedTag("All");
      setExpandedSessionIds([]);
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

  const importSessions = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) return;

      const text = await file.text();
      const importedSessions = JSON.parse(text) as SavedSession[];

      if (!Array.isArray(importedSessions)) {
        alert("Invalid Trace sessions file.");
        return;
      }

      const updatedSessions = [...importedSessions, ...sessions].slice(0, 25);

      chrome.storage.local.set({ sessions: updatedSessions }, () => {
        setSessions(updatedSessions);
      });
    };

    input.click();
  };

  const availableTags = Array.from(
    new Set(sessions.map((session) => session.tag).filter(Boolean))
  ) as string[];

  const filteredSessions = sessions
    .filter((session) => {
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        session.name.toLowerCase().includes(query) ||
        session.summary?.toLowerCase().includes(query) ||
        session.tag?.toLowerCase().includes(query) ||
        session.tabs.some(
          (tab) =>
            tab.title.toLowerCase().includes(query) ||
            tab.url.toLowerCase().includes(query)
        );

      const matchesTag = selectedTag === "All" || session.tag === selectedTag;

      return matchesSearch && matchesTag;
    })
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

  const favoriteSessions = filteredSessions.filter((session) => session.isPinned);
  const regularSessions = filteredSessions.filter((session) => !session.isPinned);

  const totalTabs = sessions.reduce(
    (total, session) => total + session.tabs.length,
    0
  );

  const renderSessionCard = (session: SavedSession) => (
    <article className="sessionCard" key={session.id}>
      <div className="sessionHeader">
        <div>
          <h3>
            {session.isPinned ? "📌 " : ""}
            {session.name}
          </h3>

          {session.tag && <span className="sessionTag">{session.tag}</span>}

          <p>
            {new Date(session.createdAt).toLocaleString()} ·{" "}
            {session.tabs.length} tabs
          </p>

          {session.summary && (
            <p className="sessionSummary">{session.summary}</p>
          )}
        </div>

        <div className="primarySessionActions">
          <button onClick={() => restoreSession(session)}>Restore</button>

          <button onClick={() => toggleSessionExpanded(session.id)}>
            {expandedSessionIds.includes(session.id) ? "Hide Tabs" : "Show Tabs"}
          </button>
        </div>
      </div>

      {expandedSessionIds.includes(session.id) && (
        <>
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

          <div className="secondarySessionActions">
            <button onClick={() => togglePinSession(session.id)}>
              {session.isPinned ? "Unpin" : "Pin"}
            </button>

            <button onClick={() => tagSession(session.id)}>Tag</button>

            <button onClick={() => renameSession(session.id)}>Rename</button>

            <button onClick={() => editSessionSummary(session.id)}>
              Edit Summary
            </button>

            <button onClick={() => copySessionLinks(session)}>Copy</button>

            <button
              className="dangerButton"
              onClick={() => deleteSession(session.id)}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </article>
  );

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

      <div className="stats">
        <span>{sessions.length} sessions</span>
        <span>{totalTabs} tabs saved</span>
      </div>

      <input
        className="searchInput"
        type="search"
        placeholder="Search saved tabs..."
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      {availableTags.length > 0 && (
        <div className="tagFilters">
          <button
            className={selectedTag === "All" ? "activeTagFilter" : ""}
            onClick={() => setSelectedTag("All")}
          >
            All
          </button>

          {availableTags.map((tag) => (
            <button
              key={tag}
              className={selectedTag === tag ? "activeTagFilter" : ""}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="utilityActions">
          <button className="secondaryButton" onClick={importSessions}>
            Import Sessions
          </button>

          <button className="secondaryButton" onClick={exportSessions}>
            Export Sessions
          </button>

          <button className="secondaryButton" onClick={clearAllSessions}>
            Clear All Sessions
          </button>
        </div>
      )}

      <section className="sessions">
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
          <>
            {favoriteSessions.length > 0 && (
              <div className="sessionGroup">
                <h2>Favorites</h2>
                {favoriteSessions.map(renderSessionCard)}
              </div>
            )}

            {regularSessions.length > 0 && (
              <div className="sessionGroup">
                <h2>
                  {favoriteSessions.length > 0 ? "All Sessions" : "Saved Sessions"}
                </h2>
                {regularSessions.map(renderSessionCard)}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default App;