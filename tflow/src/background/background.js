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

  // Check if the tab has been interacted with in the last 2 minutes
  if (currentTime - lastInteraction <= INACTIVITY_THRESHOLD) {
    return false;
  }

  // Check if the tab was created within the last 2 minutes
  if (currentTime - creationTime <= INACTIVITY_THRESHOLD) {
    return false;
  }

  return true;
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
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const activeTab = tabs.find((tab) => tab.active);
    if (!activeTab) {
      console.error("No active tab found");
      return;
    }

    updateLastInteractionTime(activeTab.id);

    const tabsToGroup = tabs.filter(
      (tab) => tab.id !== activeTab.id && isTabInactive(tab.id)
    );

    if (tabsToGroup.length === 0) {
      console.log("No inactive tabs to group");
      return;
    }

    const tabIdsToGroup = tabsToGroup.map((tab) => tab.id);

    if (inactiveGroupId !== null) {
      // If the group already exists, just move the tabs into the existing group
      chrome.tabs.group(
        { groupId: inactiveGroupId, tabIds: tabIdsToGroup },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error adding tabs to existing group:",
              chrome.runtime.lastError
            );
          }
        }
      );
    } else {
      // Create a new group and store its ID
      chrome.tabs.group({ tabIds: tabIdsToGroup }, (groupId) => {
        if (chrome.runtime.lastError) {
          console.error("Error creating group:", chrome.runtime.lastError);
          return;
        }

        // Save the group ID so no other group is created
        inactiveGroupId = groupId;

        // Update group properties
        chrome.tabGroups.update(
          groupId,
          {
            title: "Inactive Tabs",
            collapsed: true,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error("Error updating group:", chrome.runtime.lastError);
            }
          }
        );
      });
    }
  });
}

// Setup listeners and start the grouping process
setupTabListeners();
setInterval(groupInactiveTabs, CHECK_INTERVAL);
