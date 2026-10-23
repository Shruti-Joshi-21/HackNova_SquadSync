const appUrlInput = document.getElementById("appUrl");
const deadlineInput = document.getElementById("deadline");
const saveButton = document.getElementById("save");
const status = document.getElementById("status");

async function load() {
  const stored = await chrome.storage.local.get(["appUrl", "defaultDeadline"]);
  if (stored.appUrl) appUrlInput.value = stored.appUrl;
  if (stored.defaultDeadline) deadlineInput.value = stored.defaultDeadline;
}

saveButton.addEventListener("click", async () => {
  await chrome.storage.local.set({
    appUrl: appUrlInput.value.trim(),
    defaultDeadline: deadlineInput.value,
  });
  status.style.display = "block";
  setTimeout(() => {
    status.style.display = "none";
  }, 1500);
});

load();