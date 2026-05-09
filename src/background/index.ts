/// <reference types="chrome" />

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

const AUTO_SAVE_ALARM = "trace-auto-save";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(AUTO_SAVE_ALARM, {
    periodInMinutes: 5,
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_SAVE_ALARM) {
    saveCurrentWindowSession();
  }
});

const saveCurrentWindowSession = async () => {
  const windows = await chrome.windows.getAll({
    populate: true,
    windowTypes: ["normal"],
  });

  const focusedWindow = windows.find((window) => window.focused) || windows[0];

  if (!focusedWindow?.tabs?.length) return;

  const tabs = focusedWindow.tabs;
  const currentUrls = tabs.map((tab) => tab.url || "");

  chrome.storage.local.get(
    ["sessions"],
    (result: { sessions?: SavedSession[] }) => {
      const existingSessions = result.sessions || [];
      const latestSession = existingSessions[0];

      if (latestSession) {
        const latestUrls = latestSession.tabs.map((tab) => tab.url);
        const isDuplicate =
          JSON.stringify(currentUrls) === JSON.stringify(latestUrls);

        if (isDuplicate) return;
      }

      const newSession: SavedSession = {
        id: crypto.randomUUID(),
        name: `Auto-save · ${new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}`,
        createdAt: new Date().toISOString(),
        tabs: tabs.map((tab) => ({
          id: crypto.randomUUID(),
          title: tab.title || "Untitled",
          url: tab.url || "",
          favIconUrl: tab.favIconUrl,
        })),
      };

      const updatedSessions = [newSession, ...existingSessions].slice(0, 25);

      chrome.storage.local.set({
        sessions: updatedSessions,
        lastSavedAt: new Date().toISOString(),
      });
    }
  );
};