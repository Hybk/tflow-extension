/* global chrome */

console.log("TabFlow, Tab Manager extension is starting");

let INACTIVITY_THRESHOLD = 60 * 60 * 1000;
let DELETE_INACTIVE_GROUP_INTERVAL = 24 * 60 * 60 * 1000;
const UNDO_TIMEOUT = 10000;

const tabLastInteractionTime = new Map();
const tabCreationTime = new Map();
let inactiveGroupId = null;
let inactiveGroupCreationTime = null;
let deleteImmediately = false;
let deletedTabs = [];

let checkInactiveTabsTimeout;
let deleteInactiveGroupInterval;

async function saveState() {
  const state = {
    inactiveGroupId,
    inactiveGroupCreationTime,
    tabCreationTime: [...tabCreationTime.entries()],
    tabLastInteractionTime: [...tabLastInteractionTime.entries()],
    deleteImmediately,
    INACTIVITY_THRESHOLD,
    DELETE_INACTIVE_GROUP_INTERVAL,
  };
  await chrome.storage.local.set({ tabFlowState: state });
  console.log("Saved state:", state);
}

async function restoreState() {
  const result = await chrome.storage.local.get("tabFlowState");
  const state = result.tabFlowState || {};
  inactiveGroupId = state.inactiveGroupId || null;
  inactiveGroupCreationTime = state.inactiveGroupCreationTime || null;
  deleteImmediately = state.deleteImmediately || false;
  INACTIVITY_THRESHOLD = state.INACTIVITY_THRESHOLD || 60 * 60 * 1000;
  DELETE_INACTIVE_GROUP_INTERVAL =
    state.DELETE_INACTIVE_GROUP_INTERVAL || 24 * 60 * 60 * 1000;

  tabCreationTime.clear();
  tabLastInteractionTime.clear();

  (state.tabCreationTime || []).forEach(([key, value]) =>
    tabCreationTime.set(parseInt(key), value)
  );
  (state.tabLastInteractionTime || []).forEach(([key, value]) =>
    tabLastInteractionTime.set(parseInt(key), value)
  );

  console.log("Restored state:", state);
}

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

async function findOrCreateInactiveGroup(tabIds) {
  console.log("Searching for existing 'Inactive Tabs' group");
  const groups = await chrome.tabGroups.query({ title: "Inactive Tabs" });

  if (groups.length > 0) {
    inactiveGroupId = groups[0].id;
    console.log(
      `Found existing 'Inactive Tabs' group with ID: ${inactiveGroupId}`
    );
    return inactiveGroupId;
  }

  if (tabIds && tabIds.length > 0) {
    console.log("'Inactive Tabs' group not found, creating a new one");
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title: "Inactive Tabs",
      collapsed: true,
      color: "cyan",
    });
    inactiveGroupId = groupId;
    inactiveGroupCreationTime = Date.now();
    console.log(
      `Created new 'Inactive Tabs' group with ID: ${inactiveGroupId}`
    );
    return inactiveGroupId;
  }

  console.log("No tabs to group, 'Inactive Tabs' group not created");
  return null;
}

async function groupTabs(tabIds) {
  if (tabIds.length === 0) return;

  console.log(`Attempting to group tabs: ${tabIds.join(", ")}`);
  try {
    const groupId = await findOrCreateInactiveGroup(tabIds);
    if (groupId) {
      await chrome.tabs.group({ groupId, tabIds });
      console.log(`Added tabs to 'Inactive Tabs' group with ID: ${groupId}`);
    } else {
      console.log("No group created, tabs not grouped");
    }
    await saveState();
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
        await chrome.tabGroups.remove(inactiveGroupId);
        inactiveGroupId = null;
        inactiveGroupCreationTime = null;
        console.log(
          `Removed empty inactive group and reset inactiveGroupId to null`
        );
      }
      await saveState();
    }
  } catch (error) {
    console.error("Error ungrouping tabs:", error);
  }
}

async function checkAndUngroupTab(tabId) {
  console.log(`Checking if tab ${tabId} needs to be ungrouped`);
  try {
    const tab = await chrome.tabs.get(tabId);
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
    saveState();
  });
}

async function groupInactiveTabs() {
  console.log("Checking for inactive tabs");

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

    if (deleteImmediately) {
      await deleteInactiveTabs(tabIdsToGroup);
    } else {
      await groupTabs(tabIdsToGroup);
    }
  } catch (error) {
    console.error("Error in groupInactiveTabs:", error);
  }

  // Schedule the next check
  scheduleNextCheck();
}

function scheduleNextCheck() {
  clearTimeout(checkInactiveTabsTimeout);
  checkInactiveTabsTimeout = setTimeout(
    groupInactiveTabs,
    INACTIVITY_THRESHOLD
  );
}

async function deleteInactiveTabs(tabIds) {
  console.log(`Deleting inactive tabs: ${tabIds.join(", ")}`);
  try {
    const tabsToDelete = await Promise.all(
      tabIds.map((tabId) => chrome.tabs.get(tabId))
    );
    deletedTabs = tabsToDelete.filter((tab) => tab);
    await chrome.tabs.remove(tabIds);
    console.log(`Deleted inactive tabs: ${tabIds.join(", ")}`);
    showDeleteNotification();
  } catch (error) {
    console.error("Error deleting inactive tabs:", error);
  }
}

function showDeleteNotification() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Inactive Tabs Deleted",
    message: "Inactive tabs have been deleted. Click to undo.",
    buttons: [{ title: "Undo" }, { title: "Dismiss" }],
    priority: 2,
  });

  setTimeout(() => {
    chrome.notifications.clear("inactiveTabsDeleted");
    deletedTabs = [];
  }, UNDO_TIMEOUT);
}

chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    if (notificationId === "inactiveTabsDeleted") {
      if (buttonIndex === 0) {
        undoTabDeletion();
      }

      chrome.notifications.clear(notificationId);
    }
  }
);

async function undoTabDeletion() {
  console.log("Undoing tab deletion");
  try {
    for (const tab of deletedTabs) {
      await chrome.tabs.create({
        url: tab.url,
        pinned: tab.pinned,
        index: tab.index,
      });
    }
    console.log("Restored deleted tabs");
    deletedTabs = [];
  } catch (error) {
    console.error("Error undoing tab deletion:", error);
  }
}

function checkPermissions() {
  chrome.permissions.contains(
    {
      permissions: ["tabs", "tabGroups", "storage", "notifications"],
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

async function handleWindowClose(windowId) {
  console.log(`Window ${windowId} closing, saving state`);
  await saveState();
}

async function handleWindowOpen(window) {
  console.log(`Window ${window.id} opened, restoring state`);
  await restoreState();
  await groupInactiveTabs();
}

async function deleteInactiveGroupIfExpired() {
  console.log("Checking if inactive group should be deleted");
  if (inactiveGroupId && inactiveGroupCreationTime) {
    const currentTime = Date.now();
    if (
      currentTime - inactiveGroupCreationTime >=
      DELETE_INACTIVE_GROUP_INTERVAL
    ) {
      console.log("Inactive group has expired. Deleting it and its tabs.");
      try {
        const groupTabs = await chrome.tabs.query({ groupId: inactiveGroupId });
        const tabIds = groupTabs.map((tab) => tab.id);

        deletedTabs = groupTabs;
        await Promise.all([
          chrome.tabs.remove(tabIds),
          chrome.tabGroups.remove(inactiveGroupId),
        ]);

        inactiveGroupId = null;
        inactiveGroupCreationTime = null;
        console.log("Inactive group and its tabs deleted successfully");
        await saveState();
        showDeleteNotification();
      } catch (error) {
        console.error("Error deleting inactive group and its tabs:", error);
      }
    } else {
      console.log("Inactive group has not expired yet");
    }
  } else {
    console.log("No inactive group to delete");
  }
}

function updateSettings(settings) {
  console.log("Updating settings:", settings);
  INACTIVITY_THRESHOLD = settings.inactiveTime * 60 * 1000;
  deleteImmediately = settings.action === "delete";
  DELETE_INACTIVE_GROUP_INTERVAL = settings.groupTime * 60 * 1000;
  console.log(`New INACTIVITY_THRESHOLD: ${INACTIVITY_THRESHOLD}`);
  console.log(`New deleteImmediately: ${deleteImmediately}`);
  console.log(
    `New DELETE_INACTIVE_GROUP_INTERVAL: ${DELETE_INACTIVE_GROUP_INTERVAL}`
  );
  saveState();

  clearTimeout(checkInactiveTabsTimeout);
  clearInterval(deleteInactiveGroupInterval);

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      updateLastInteractionTime(tab.id);
    });
  });

  scheduleNextCheck();

  deleteInactiveGroupInterval = setInterval(
    deleteInactiveGroupIfExpired,
    DELETE_INACTIVE_GROUP_INTERVAL
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "updateSettings") {
    updateSettings(message.settings);
    sendResponse({ success: true });
  } else if (message.type === "getSettings") {
    sendResponse({
      action: deleteImmediately ? "delete" : "group",
      inactiveTime: INACTIVITY_THRESHOLD / (60 * 1000),
      groupTime: DELETE_INACTIVE_GROUP_INTERVAL / (60 * 1000),
    });
  }
  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    // Set default settings if not already set
    chrome.storage.local.get(
      ["action", "inactiveTime", "groupTime"],
      (result) => {
        if (!result.action || !result.inactiveTime || !result.groupTime) {
          const defaultSettings = {
            action: "group",
            inactiveTime: 60,
            groupTime: 180,
          };
          chrome.storage.local.set(defaultSettings, () => {
            console.log("Default settings applied:", defaultSettings);
            updateSettings(defaultSettings);
          });
        } else {
          updateSettings({
            action: result.action,
            inactiveTime: result.inactiveTime,
            groupTime: result.groupTime,
          });
        }
      }
    );
  }
});

function init() {
  restoreState().then(async () => {
    // Load settings
    chrome.storage.local.get(
      ["action", "inactiveTime", "groupTime"],
      (result) => {
        if (result.action && result.inactiveTime && result.groupTime) {
          updateSettings({
            action: result.action,
            inactiveTime: result.inactiveTime,
            groupTime: result.groupTime,
          });
        }
      }
    );

    setupTabListeners();
    checkPermissions();

    deleteInactiveGroupInterval = setInterval(
      deleteInactiveGroupIfExpired,
      DELETE_INACTIVE_GROUP_INTERVAL
    );

    chrome.windows.onRemoved.addListener(handleWindowClose);
    chrome.windows.onCreated.addListener(handleWindowOpen);
  });
}

init();
