/* global chrome */

const INACTIVITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

let tabLastInteractionTime = {};
let inactiveGroupId = null;

function updateLastInteractionTime(tabId) {
  tabLastInteractionTime[tabId] = Date.now();
}

function isTabInactive(tabId) {
  const lastInteraction = tabLastInteractionTime[tabId] || 0;
  return Date.now() - lastInteraction > INACTIVITY_THRESHOLD;
}

function injectContentScript(tabId) {
  chrome.tabs.executeScript(tabId, {
    code: `
      if (!window.interactionListenerAdded) {
        window.interactionListenerAdded = true;
        document.addEventListener('mousemove', () => {
          chrome.runtime.sendMessage({action: 'interaction', tabId: ${tabId}});
        });
        document.addEventListener('keydown', () => {
          chrome.runtime.sendMessage({action: 'interaction', tabId: ${tabId}});
        });
      }
    `,
  });
}

function setupListeners() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => injectContentScript(tab.id));
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
      injectContentScript(tabId);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "interaction") {
      updateLastInteractionTime(message.tabId);
      removeTabFromInactiveGroup(message.tabId);
    }
  });
}

function removeTabFromInactiveGroup(tabId) {
  if (inactiveGroupId !== null) {
    chrome.tabs.ungroup(tabId, () => {
      if (chrome.runtime.lastError) {
        console.error("Error ungrouping tab:", chrome.runtime.lastError);
      }
    });
  }
}

function manageInactiveTabs() {
  chrome.tabs.query({}, (tabs) => {
    const inactiveTabs = tabs.filter((tab) => isTabInactive(tab.id));
    const activeTabs = tabs.filter((tab) => !isTabInactive(tab.id));

    // Ungroup active tabs
    activeTabs.forEach((tab) => removeTabFromInactiveGroup(tab.id));

    if (inactiveTabs.length === 0) {
      console.log("No inactive tabs to group");
      return;
    }

    const tabIdsToGroup = inactiveTabs.map((tab) => tab.id);

    if (inactiveGroupId === null) {
      // Create a new group if it doesn't exist
      chrome.tabs.group({ tabIds: tabIdsToGroup }, (groupId) => {
        if (chrome.runtime.lastError) {
          console.error("Error creating group:", chrome.runtime.lastError);
          return;
        }
        inactiveGroupId = groupId;
        updateGroupProperties(groupId);
      });
    } else {
      chrome.tabs.group(
        { tabIds: tabIdsToGroup, groupId: inactiveGroupId },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Error adding to group:", chrome.runtime.lastError);
            return;
          }
          updateGroupProperties(inactiveGroupId);
        }
      );
    }
  });
}

function updateGroupProperties(groupId) {
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
}

setupListeners();
setInterval(manageInactiveTabs, CHECK_INTERVAL);
