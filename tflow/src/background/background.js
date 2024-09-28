/* global chrome */

console.log("TabFlow, Tab Manager extension is starting");

const INACTIVITY_THRESHOLD = 2 * 60 * 1000;
const CHECK_INTERVAL = 30 * 1000;

const tabLastInteractionTime = new Map();
const tabCreationTime = new Map();
let inactiveGroupId = null;
let initialDelay = true;

async function saveState() {
  const state = {
    inactiveGroupId,
    tabCreationTime: [...tabCreationTime.entries()],
    tabLastInteractionTime: [...tabLastInteractionTime.entries()],
  };
  await chrome.storage.local.set({ tabFlowState: state });
  console.log("Saved state:", state);
}

async function restoreState() {
  const result = await chrome.storage.local.get("tabFlowState");
  const state = result.tabFlowState || {};
  inactiveGroupId = state.inactiveGroupId || null;

  // Restore Maps
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

    await groupTabs(tabIdsToGroup);
  } catch (error) {
    console.error("Error in groupInactiveTabs:", error);
  }
}

function checkPermissions() {
  chrome.permissions.contains(
    {
      permissions: ["tabs", "tabGroups", "storage"],
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

function init() {
  restoreState().then(async () => {
    setupTabListeners();
    checkPermissions();
    console.log(
      `Setting up interval to check every ${CHECK_INTERVAL / 1000} seconds`
    );
    setInterval(groupInactiveTabs, CHECK_INTERVAL);

    chrome.windows.onRemoved.addListener(handleWindowClose);
    chrome.windows.onCreated.addListener(handleWindowOpen);
  });
}

init();

// chrome.action.onClicked.addListener(() => {
//   console.log("Extension icon clicked. Attempting to group all tabs.");
//   chrome.tabs.query({ currentWindow: true }, (tabs) => {
//     const tabIds = tabs.map((t) => t.id);
//     groupTabs(tabIds);
//   });
// });
