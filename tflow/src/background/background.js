/* global chrome */

const INACTIVITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

let tabLastInteractionTime = {};
let tabCreationTime = {};
let inactiveGroupId = null; // To store the ID of the inactive tabs group

// Update the last interaction time for the active tab
function updateLastInteractionTime(tabId) {
  tabLastInteractionTime[tabId] = Date.now();
}

// Check if a tab is inactive for longer than the defined threshold
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

// Group inactive tabs into one tab group
async function groupTabs(tabIds) {
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, {
    title: "Inactive Tabs",
    collapsed: true,
    color: "cyan",
  });

  // Store the group ID for future reference
  inactiveGroupId = groupId;
}

// Ungroup tabs that have become active again or opened
async function ungroupTabs(tabIds) {
  await chrome.tabs.ungroup(tabIds);
}

// Check and ungroup a tab if it's part of the inactive group
async function checkAndUngroupTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.groupId === inactiveGroupId) {
    await ungroupTabs([tabId]);
  }
}

// Set up tab listeners to track tab activity
function setupTabListeners() {
  // When a tab is activated (switched to), update the interaction time and ungroup if necessary
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    updateLastInteractionTime(tabId);

    // Check if the tab is in the inactive group and ungroup it
    await checkAndUngroupTab(tabId);
  });

  // When a tab is updated (e.g., URL changed or finished loading), update the interaction time
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
      updateLastInteractionTime(tabId);

      // Check if the tab is in the inactive group and ungroup it
      checkAndUngroupTab(tabId);
    }
  });

  // When a new tab is created, set its creation and interaction time
  chrome.tabs.onCreated.addListener((tab) => {
    tabCreationTime[tab.id] = Date.now();
    updateLastInteractionTime(tab.id);
  });

  // Remove tab data when a tab is closed
  chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabLastInteractionTime[tabId];
    delete tabCreationTime[tabId];
  });
}

// Function to group inactive tabs after the inactivity threshold is reached
function groupInactiveTabs() {
  chrome.tabs.query({ currentWindow: true }, async (tabs) => {
    const activeTab = tabs.find((tab) => tab.active);
    if (!activeTab) {
      console.error("No active tab found");
      return;
    }

    // Update the interaction time of the active tab
    updateLastInteractionTime(activeTab.id);

    // Filter inactive tabs (excluding the active tab)
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

// Setup listeners and check for inactive tabs at regular intervals
setupTabListeners();
setInterval(groupInactiveTabs, CHECK_INTERVAL);
