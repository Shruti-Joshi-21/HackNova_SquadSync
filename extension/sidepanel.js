const DEFAULT_APP_URL = "https://squadsync.vercel.app";

function extractRepo(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`;
  } catch {
    return null;
  }
}

async function getAppUrl() {
  const stored = await chrome.storage.local.get("appUrl");
  return stored.appUrl || DEFAULT_APP_URL;
}

async function updatePanel(tabUrl) {
  const message = document.getElementById("message");
  const frame = document.getElementById("frame");
  const repo = extractRepo(tabUrl || "");

  if (!repo) {
    message.style.display = "block";
    frame.style.display = "none";
    frame.src = "";
    return;
  }

  const appUrl = await getAppUrl();
  message.style.display = "none";
  frame.style.display = "block";
  frame.src = `${appUrl}/embed?repo=${encodeURIComponent(repo)}`;
}

async function checkActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    updatePanel(tab.url);
  }
}

checkActiveTab();

chrome.tabs.onActivated.addListener(checkActiveTab);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    updatePanel(changeInfo.url);
  }
});