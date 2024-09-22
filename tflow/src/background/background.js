/* global chrome */

const INACTIVITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

let tabLastInteractionTime = {};

function updateLastInteractionTime(tabId) {
  tabLastInteractionTime[tabId] = Date.now();
}

function isTabInactive(tabId) {
  const lastInteraction = tabLastInteractionTime[tabId] || 0;
  return Date.now() - lastInteraction > INACTIVITY_THRESHOLD;
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

  // We can't directly listen for all interactions, so we update on tab switch
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    updateLastInteractionTime(tabId);
  });
}

function groupInactiveTabs() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const activeTab = tabs.find((tab) => tab.active);
    if (!activeTab) {
      console.error("No active tab found");
      return;
    }

    updateLastInteractionTime(activeTab.id); // Ensure active tab is marked as interacted

    const tabsToGroup = tabs.filter(
      (tab) => tab.id !== activeTab.id && isTabInactive(tab.id)
    );

    if (tabsToGroup.length === 0) {
      console.log("No inactive tabs to group");
      return;
    }

    const tabIdsToGroup = tabsToGroup.map((tab) => tab.id);

    // Group the inactive tabs
    chrome.tabs.group({ tabIds: tabIdsToGroup }, (groupId) => {
      if (chrome.runtime.lastError) {
        console.error("Error creating group:", chrome.runtime.lastError);
        return;
      }

      // Optionally update group properties
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
  });
}

// Setup listeners and start the grouping process
setupTabListeners();
setInterval(groupInactiveTabs, CHECK_INTERVAL);