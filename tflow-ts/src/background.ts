import browser from "webextension-polyfill";


const INACTIVITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

let tabLastInteractionTime: Record<number, number> = {};

function updateLastInteractionTime(tabId: number) {
  tabLastInteractionTime[tabId] = Date.now();
}

function isTabInactive(tabId: number) {
  const lastInteraction = tabLastInteractionTime[tabId] || 0;
  return Date.now() - lastInteraction > INACTIVITY_THRESHOLD;
}

function setupTabListeners() {
  browser.tabs.onActivated.addListener(({ tabId }) => {
    updateLastInteractionTime(tabId);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete") {
      updateLastInteractionTime(tabId);
    }
  });

  // We can't directly listen for all interactions, so we update on tab switch
  browser.tabs.onActivated.addListener(({ tabId }) => {
    updateLastInteractionTime(tabId);
  });
}

async function groupInactiveTabs() {
  const tabs = await browser.tabs.query({ currentWindow: true, active: true });
  if (!tabs.length) {
    console.error("No active tab found");
    return;
  }
  const activeTab = tabs[0];
  if (!activeTab.id) return;
  updateLastInteractionTime(activeTab.id);
  const tabsToGroup = tabs.filter((t) =>
    t.id !== activeTab.id && isTabInactive(t.id as number)
  );
  if (!tabsToGroup.length) {
    console.error("No inactive tabs to group");
    return;
  }

  const tabIdsToGroup = tabsToGroup.map((t) => t.id);

  if (browser.tabs.group && browser.tabGroups?.update) {
    const groupId = await browser.tabs.group({
      tabIds: tabIdsToGroup as number[],
    });
    browser.tabGroups.update(groupId, {
      title: "Inactive Tabs",
      collapsed: 1,
    });
  }
}

// Setup listeners and start the grouping process
setupTabListeners();
setInterval(groupInactiveTabs, CHECK_INTERVAL);
