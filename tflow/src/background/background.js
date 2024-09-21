/* global chrome */

// Store tab activity times
let activeTabs = {};
let inactiveGroupId = null;
const INACTIVE_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds
const DELETE_THRESHOLD = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

// Listen for when tabs are activated (i.e., clicked or focused)
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  recordTabActivity(tabId);
});

// Listen for when the window gains focus
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs.length > 0) {
        recordTabActivity(tabs[0].id);
      }
    });
  }
});

// Record tab activity (mouse or keyboard interactions)
function recordTabActivity(tabId) {
  activeTabs[tabId] = Date.now(); // Record the current time as last activity time
}

// Check for inactive tabs every minute
chrome.alarms.create("checkInactiveTabs", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkInactiveTabs") {
    checkInactiveTabs();
  }
  if (alarm.name.startsWith("deleteTab-")) {
    const tabId = parseInt(alarm.name.split("-")[1]);
    chrome.tabs.remove(tabId, () => {
      notifyTabDeletion([tabId]);
    });
  }
  if (alarm.name === "cleanupUndoData") {
    chrome.storage.local.remove("deletedTabs");
  }
});

// Check for tabs that have been inactive for over an hour
function checkInactiveTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const lastActive = activeTabs[tab.id] || Date.now();
      if (Date.now() - lastActive > INACTIVE_THRESHOLD) {
        moveTabToInactiveGroup(tab.id);
      }
    });
  });
}

// Move tab to 'Inactive Tab' group
function moveTabToInactiveGroup(tabId) {
  if (!inactiveGroupId) {
    // Create the inactive tab group if it doesn't exist
    chrome.tabs.group({ tabIds: tabId }, (groupId) => {
      inactiveGroupId = groupId;
      chrome.tabGroups.update(groupId, { title: "Inactive Tabs" });
    });
  } else {
    // Add tab to the existing inactive tab group
    chrome.tabs.group({ tabIds: tabId, groupId: inactiveGroupId });
  }

  // Set an alarm to delete this tab after 3 hours (use DELETE_THRESHOLD)
  chrome.alarms.create(`deleteTab-${tabId}`, {
    delayInMinutes: DELETE_THRESHOLD / (60 * 1000),
  }); // 3 hours
}

// Notify user about deleted tabs and provide an undo option
function notifyTabDeletion(tabIds) {
  chrome.notifications.create("tabDeletion", {
    type: "basic",
    iconUrl: "/icon-48px.png",
    title: "Tabs Deleted",
    message: `${tabIds.length} tabs were deleted.`,
    buttons: [{ title: "Undo" }],
    priority: 2,
  });

  // Store the deleted tab info for undo
  chrome.storage.local.set({ deletedTabs: tabIds, deletionTime: Date.now() });
}

// Handle undo action from the notification
chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    if (notificationId === "tabDeletion" && buttonIndex === 0) {
      // User clicked 'Undo'
      chrome.storage.local.get(["deletedTabs"], (result) => {
        const { deletedTabs } = result;
        deletedTabs.forEach((tabId) => {
          // Restore deleted tabs using sessions API
          chrome.sessions.restore(tabId);
        });
      });
    }
  }
);

// If the user interacts with an inactive tab, remove it from the group
chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (inactiveGroupId) {
    // Check if tab is part of the inactive group
    chrome.tabs.get(tabId, (tab) => {
      if (tab.groupId === inactiveGroupId) {
        chrome.tabs.ungroup(tabId, () => {
          delete activeTabs[tabId]; // Remove from inactive tracking
        });
      }
    });
  }
});

// Clean up old undo data after 3 hours of no interaction
chrome.alarms.create("cleanupUndoData", { periodInMinutes: 180 });
