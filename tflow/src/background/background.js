/* global chrome */

console.log("TabFlow, Tab Manager extension is starting");

const INACTIVITY_THRESHOLD = 2 * 60 * 1000;
const CHECK_INTERVAL = 30 * 1000;

const tabLastInteractionTime = new Map();
const tabCreationTime = new Map();
let inactiveGroupId = null;
let initialDelay = true;

function updateLastInteractionTime(tabId) {
  tabLastInteractionTime.set(tabId, Date.now());
  console.log(`Updated last interaction time for tab ${tabId}`);
}

function isTabInactive(tabId) {
  const lastInteraction = tabLastInteractionTime.get(tabId) || 0;
  const creationTime = tabCreationTime.get(tabId) || 0;
  const currentTime = Date.now();

  const isInactive =
    currentTime - lastInteraction > INACTIVITY_THRESHOLD &&
    currentTime - creationTime > INACTIVITY_THRESHOLD;

  console.log(`Tab ${tabId} inactive status: ${isInactive}`);
  return isInactive;
}

async function groupTabs(tabIds) {
  if (tabIds.length === 0) return;

  console.log(`Attempting to group tabs: ${tabIds.join(", ")}`);
  try {
    const groupId = await chrome.tabs.group({ tabIds });
    console.log(`Created group with ID: ${groupId}`);
    await chrome.tabGroups.update(groupId, {
      title: "Inactive Tabs",
      collapsed: true,
      color: "cyan",
    });

    inactiveGroupId = groupId;
    console.log(`Set inactiveGroupId to ${inactiveGroupId}`);
  } catch (error) {
    console.error("Error grouping tabs:", error);
  }
}

async function ungroupTabs(tabIds) {
  console.log(`Attempting to ungroup tabs: ${tabIds.join(", ")}`);
  try {
    await chrome.tabs.ungroup(tabIds);
    console.log(`Ungrouped tabs: ${tabIds.join(", ")}`);

    if (inactiveGroupId) {
      const groupTabs = await chrome.tabs.query({ groupId: inactiveGroupId });
      console.log(`Tabs remaining in inactive group: ${groupTabs.length}`);
      if (groupTabs.length > 0) {
        await chrome.tabGroups.update(inactiveGroupId, { collapsed: true });
        console.log(`Collapsed inactive group`);
      } else {
        inactiveGroupId = null;
        console.log(`Reset inactiveGroupId to null`);
      }
    }
  } catch (error) {
    console.error("Error ungrouping tabs:", error);
  }
}

async function checkAndUngroupTab(tabId) {
  console.log(`Checking if tab ${tabId} needs to be ungrouped`);
  try {
    const tab = await chrome.tabs.get(tabId);
    console.log(
      `Tab ${tabId} group: ${tab.groupId}, inactiveGroupId: ${inactiveGroupId}`
    );
    if (tab.groupId === inactiveGroupId) {
      console.log(`Ungrouping tab ${tabId}`);
      await ungroupTabs([tabId]);
    }
  } catch (error) {
    console.error("Error checking and ungrouping tab:", error);
  }
}

function setupTabListeners() {
  console.log("Setting up tab listeners");
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log(`Tab ${activeInfo.tabId} activated`);
    updateLastInteractionTime(activeInfo.tabId);
    await checkAndUngroupTab(activeInfo.tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
      console.log(`Tab ${tabId} updated`);
      updateLastInteractionTime(tabId);
      checkAndUngroupTab(tabId);
    }
  });

  chrome.tabs.onCreated.addListener((tab) => {
    console.log(`New tab created with ID ${tab.id}`);
    tabCreationTime.set(tab.id, Date.now());
    updateLastInteractionTime(tab.id);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    console.log(`Tab ${tabId} removed`);
    tabLastInteractionTime.delete(tabId);
    tabCreationTime.delete(tabId);
  });
}

async function groupInactiveTabs() {
  console.log("Checking for inactive tabs");
  if (initialDelay) {
    initialDelay = false;
    console.log("Skipping first check due to initial delay");
    return;
  }

  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    console.log(`Found ${tabs.length} tabs in current window`);
    const activeTab = tabs.find((tab) => tab.active);
    if (!activeTab) {
      console.error("No active tab found");
      return;
    }

    console.log(`Active tab is ${activeTab.id}`);
    updateLastInteractionTime(activeTab.id);

    const inactiveTabs = tabs.filter(
      (tab) => tab.id !== activeTab.id && isTabInactive(tab.id)
    );

    console.log(`Found ${inactiveTabs.length} inactive tabs`);

    if (inactiveTabs.length === 0) {
      console.log("No inactive tabs to group");
      return;
    }

    const tabIdsToGroup = inactiveTabs.map((tab) => tab.id);
    console.log(`Tabs to group: ${tabIdsToGroup.join(", ")}`);

    if (inactiveGroupId) {
      console.log(`Adding tabs to existing group ${inactiveGroupId}`);
      await chrome.tabs.group({
        groupId: inactiveGroupId,
        tabIds: tabIdsToGroup,
      });
    } else {
      console.log("Creating new group for inactive tabs");
      await groupTabs(tabIdsToGroup);
    }
  } catch (error) {
    console.error("Error in groupInactiveTabs:", error);
  }
}

function checkPermissions() {
  chrome.permissions.contains(
    {
      permissions: ["tabs", "tabGroups"],
    },
    (result) => {
      if (result) {
        console.log("The extension has the necessary permissions.");
      } else {
        console.error("The extension is missing necessary permissions.");
      }
    }
  );
}

function init() {
  setupTabListeners();
  checkPermissions();
  console.log(
    `Setting up interval to check every ${CHECK_INTERVAL / 1000} seconds`
  );
  setInterval(groupInactiveTabs, CHECK_INTERVAL);
}

init();

chrome.action.onClicked.addListener(() => {
  console.log("Extension icon clicked. Attempting to group all tabs.");
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const tabIds = tabs.map((t) => t.id);
    groupTabs(tabIds);
  });
});
