/* global chrome */

const INACTIVITY_THRESHOLD = 2 * 60 * 1000;
const CHECK_INTERVAL = 30 * 1000;

let tabLastInteractionTime = {};
let tabCreationTime = {};
let inactiveGroupId = null;
let initialDelay = true;

function updateLastInteractionTime(tabId) {
  tabLastInteractionTime[tabId] = Date.now();
}

function isTabInactive(tabId) {
  const lastInteraction = tabLastInteractionTime[tabId] || 0;
  const creationTime = tabCreationTime[tabId] || 0;
  const currentTime = Date.now();

  return (
    currentTime - lastInteraction > INACTIVITY_THRESHOLD &&
    currentTime - creationTime > INACTIVITY_THRESHOLD
  );
}

// Group inactive tabs into one tab group
async function groupTabs(tabIds) {
  if (tabIds.length === 0) return;

  try {
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title: "Inactive Tabs",
      collapsed: true,
      color: "cyan",
    });

    inactiveGroupId = groupId;
  } catch (error) {
    console.error("Error grouping tabs:", error);
  }
}

async function ungroupTabs(tabIds) {
  try {
    await chrome.tabs.ungroup(tabIds);

    if (inactiveGroupId) {
      const groupTabs = await chrome.tabs.query({ groupId: inactiveGroupId });
      if (groupTabs.length > 0) {
        await chrome.tabGroups.update(inactiveGroupId, { collapsed: true });
      } else {
        inactiveGroupId = null;
      }
    }
  } catch (error) {
    console.error("Error ungrouping tabs:", error);
  }
}

async function checkAndUngroupTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.groupId === inactiveGroupId) {
      await ungroupTabs([tabId]);
    }
  } catch (error) {
    console.error("Error checking and ungrouping tab:", error);
  }
}

function setupTabListeners() {
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    updateLastInteractionTime(tabId);
    await checkAndUngroupTab(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
      updateLastInteractionTime(tabId);
      checkAndUngroupTab(tabId);
    }
  });

  chrome.tabs.onCreated.addListener((tab) => {
    tabCreationTime[tab.id] = Date.now();
    updateLastInteractionTime(tab.id);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabLastInteractionTime[tabId];
    delete tabCreationTime[tabId];
  });
}

async function groupInactiveTabs() {
  if (initialDelay) {
    initialDelay = false;
    return;
  }

  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
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
      await chrome.tabs.group({
        groupId: inactiveGroupId,
        tabIds: tabIdsToGroup,
      });
    } else {
      await groupTabs(tabIdsToGroup);
    }
  } catch (error) {
    console.error("Error in groupInactiveTabs:", error);
  }
}

setupTabListeners();
setInterval(groupInactiveTabs, CHECK_INTERVAL);
