/* global chrome */

const INACTIVITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

let tabLastInteractionTime = {};
let tabCreationTime = {};
let inactiveGroupId = null; // To store the ID of the inactive tabs group

function updateLastInteractionTime(tabId) {
  tabLastInteractionTime[tabId] = Date.now();
}

function isTabInactive(tabId) {
  const lastInteraction = tabLastInteractionTime[tabId] || 0;
  const creationTime = tabCreationTime[tabId] || 0;
  const currentTime = Date.now();

  // Check if the tab has been inactive for more than 2 minutes
  return (
    currentTime - lastInteraction > INACTIVITY_THRESHOLD &&
    currentTime - creationTime > INACTIVITY_THRESHOLD
  );
}

async function groupTabs(tabIds) {
  // Group inactive tabs and store the group ID
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, {
    title: "Inactive Tabs",
    collapsed: true,
    color: "cyan",
  });

  // Store the group ID for future reference
  inactiveGroupId = groupId;
}

async function ungroupTabs(tabIds) {
  await chrome.tabs.ungroup(tabIds);
}

async function groupUngroupTabs(tabs) {
  const tabIds = tabs.map(({ id }) => id);

  if (!tabIds.length) {
    return;
  }

  const groupIds = tabs.map(({ groupId }) => groupId);
  if (
    groupIds.length === 1 &&
    groupIds[0] === chrome.tabGroups.TAB_GROUP_ID_NONE
  ) {
    await groupTabs(tabIds);
    return;
  }

  for (let i = 0; i < groupIds.length - 1; i++) {
    if (
      groupIds[i] === chrome.tabGroups.TAB_GROUP_ID_NONE ||
      groupIds[i] !== groupIds[i + 1]
    ) {
      await groupTabs(tabIds);
      return;
    }
  }

  await ungroupTabs(tabIds);
}

function setupTabListeners() {
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    updateLastInteractionTime(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
      updateLastInteractionTime(tabId);
    }
  });

  chrome.tabs.onCreated.addListener((tab) => {
    tabCreationTime[tab.id] = Date.now();
    updateLastInteractionTime(tab.id);
  });

  // Remove tab data on removal
  chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabLastInteractionTime[tabId];
    delete tabCreationTime[tabId];
  });
}

function groupInactiveTabs() {
  chrome.tabs.query({ currentWindow: true }, async (tabs) => {
    const activeTab = tabs.find((tab) => tab.active);
    if (!activeTab) {
      console.error("No active tab found");
      return;
    }

    updateLastInteractionTime(activeTab.id);

    const inactiveTabs = tabs.filter(
      (tab) => tab.id !== activeTab.id && isTabInactive(tab.id)
    );

    if (inactiveTabs.length === 0) {
      console.log("No inactive tabs to group");
      return;
    }

    const tabIdsToGroup = inactiveTabs.map((tab) => tab.id);

    if (inactiveGroupId) {
      // If a group already exists, add tabs to the existing group
      await chrome.tabs.group({
        groupId: inactiveGroupId,
        tabIds: tabIdsToGroup,
      });
    } else {
      // Otherwise, create a new group and assign its ID
      await groupTabs(tabIdsToGroup);
    }
  });
}

// Setup listeners and start checking every 30 seconds for inactive tabs
setupTabListeners();
setInterval(groupInactiveTabs, CHECK_INTERVAL);

async function getTabs(urls) {
  const tabs = await chrome.tabs.query({ url: urls });

  const collator = new Intl.Collator();
  tabs.sort((a, b) => collator.compare(a.title, b.title));
  return tabs;
}

async function setUpHTML(urls) {
  const tabs = await getTabs(urls);
  const template = document.getElementById("li_template");
  const elements = new Set();

  for (const tab of tabs) {
    const element = template.content.firstElementChild.cloneNode(true);

    const title = tab.title.split("-")[0].trim();
    const pathname = new URL(tab.url).pathname.slice("/docs".length);

    element.querySelector(".title").textContent = title;
    element.querySelector(".pathname").textContent = pathname;
    element.querySelector("a").addEventListener("click", async () => {
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
    });

    elements.add(element);
  }

  document.querySelector("ul").append(...elements);

  const button = document.querySelector("button");
  button.addEventListener("click", () => groupUngroupTabs(tabs));
}

const urls = [
  "https://developer.chrome.com/docs/webstore/*",
  "https://developer.chrome.com/docs/extensions/*",
  // "https://*/*",
  // "http://*/*",
];

setUpHTML(urls);
