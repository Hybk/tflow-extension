/* global chrome */

function groupInactiveTabs() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const activeTab = tabs.find((tab) => tab.active);
    if (!activeTab) {
      console.error("No active tab found");
      return;
    }

    const tabsToGroup = tabs.filter((tab) => tab.id !== activeTab.id);

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

// Run immediately and then every minute
groupInactiveTabs();
setInterval(groupInactiveTabs, 60 * 1000);
