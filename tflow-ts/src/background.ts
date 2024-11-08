/* global chrome */

import { Logger } from "tslog";
// Type definitions

type Timeout = ReturnType<typeof setTimeout>;
type Interval = ReturnType<typeof setInterval>;
interface TabState {
  inactiveGroupId: number | null;
  inactiveGroupCreationTime: number | null;
  tabCreationTime: Array<[number, number]>;
  tabLastInteractionTime: Array<[number, number]>;
  deleteImmediately: boolean;
  deleteInactiveGroup: boolean;
  INACTIVITY_THRESHOLD: number;
  DELETE_INACTIVE_GROUP_INTERVAL: number;
  continueWhereLeftOff: boolean;
}

interface ScriptInjectionDetails {
  target: { tabId: number };
  func: () => void;
}

interface MyLogObj {
  level: string;
  message: string;
  timestamp: number;
}

interface TabFlowSettings {
  action: "delete" | "group";
  inactiveTime: number;
  deleteInactiveGroup: boolean;
  groupDeleteTime: number;
  continueWhereLeftOff: boolean;
}

interface SavedTab {
  url: string;
  pinned: boolean;
  active: boolean;
}

interface SavedWindow {
  tabs: SavedTab[];
}

interface TabCounts {
  totalTabs: number;
  inactiveTabs: number;
  activeTabs: number;
}

// Message Types
interface BaseMessage {
  type: string;
}

interface UpdateSettingsMessage extends BaseMessage {
  type: "updateSettings";
  settings: TabFlowSettings;
}

interface GetSettingsMessage extends BaseMessage {
  type: "getSettings";
}

interface ManualCleanupMessage extends BaseMessage {
  type: "manualCleanup";
}

interface GetTabCountsMessage extends BaseMessage {
  type: "getTabCounts";
}

interface TabActivityMessage extends BaseMessage {
  type: "tabActivity";
  timestamp: number;
}

type RuntimeMessage =
  | UpdateSettingsMessage
  | GetSettingsMessage
  | ManualCleanupMessage
  | GetTabCountsMessage
  | TabActivityMessage;

// interface RuntimeMessage {
//   type: string;
//   settings?: TabFlowSettings;
// }

interface SuccessResponse {
  success: boolean;
  error?: string;
}

interface SettingsResponse {
  action: "delete" | "group";
  inactiveTime: number;
  deleteInactiveGroup: boolean;
  groupDeleteTime: number;
  continueWhereLeftOff: boolean;
}
type MessageResponse = SuccessResponse | SettingsResponse | TabCounts;

class TabFlowManager {
  private INACTIVITY_THRESHOLD: number = 60 * 60 * 1000;
  private DELETE_INACTIVE_GROUP_INTERVAL: number = 24 * 60 * 60 * 1000;
  private readonly UNDO_TIMEOUT: number = 10000;
  private readonly ACTIVITY_CHECK_INTERVAL: number = 60 * 1000;

  private tabLastInteractionTime: Map<number, number> = new Map();
  private tabCreationTime: Map<number, number> = new Map();
  private inactiveGroupId: number | null = null;
  private inactiveGroupCreationTime: number | null = null;
  private deleteImmediately: boolean = false;
  private deleteInactiveGroup: boolean = false;
  private deletedTabs: chrome.tabs.Tab[] = [];
  private continueWhereLeftOff: boolean = false;
  // private readonly activityCheckInterval: Interval | undefined;

  private checkInactiveTabsTimeout?: Timeout;
  private activityCheckInterval?: Interval;
  private deleteInactiveGroupInterval?: Interval;
  private logger: Logger<MyLogObj>;

  constructor() {
    this.logger = this.setupLogger();
    this.init();
  }

  private setupLogger(): Logger<MyLogObj> {
    return new Logger<MyLogObj>({
      name: "TabFlowManager",
    });
  }

  private setupActivityMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender) => {
      if (message.type === "tabActivity" && sender.tab?.id) {
        this.updateLastInteractionTime(sender.tab.id);
        this.saveState();
      }
    });
  }

  private async saveState(): Promise<void> {
    const state: TabState = {
      inactiveGroupId: this.inactiveGroupId,
      inactiveGroupCreationTime: this.inactiveGroupCreationTime,
      tabCreationTime: Array.from(this.tabCreationTime.entries()),
      tabLastInteractionTime: Array.from(this.tabLastInteractionTime.entries()),
      deleteImmediately: this.deleteImmediately,
      deleteInactiveGroup: this.deleteInactiveGroup,
      INACTIVITY_THRESHOLD: this.INACTIVITY_THRESHOLD,
      DELETE_INACTIVE_GROUP_INTERVAL: this.DELETE_INACTIVE_GROUP_INTERVAL,
      continueWhereLeftOff: this.continueWhereLeftOff,
    };
    await chrome.storage.local.set({ tabFlowState: state });
    this.logger.info("Saved state:", state);
  }

  private async restoreState(): Promise<void> {
    const result = await chrome.storage.local.get("tabFlowState");
    const state = (result.tabFlowState as TabState) || {};

    this.inactiveGroupId = state.inactiveGroupId ?? null;
    this.inactiveGroupCreationTime = state.inactiveGroupCreationTime ?? null;
    this.deleteImmediately = state.deleteImmediately ?? false;
    this.deleteInactiveGroup = state.deleteInactiveGroup ?? false;
    this.INACTIVITY_THRESHOLD = state.INACTIVITY_THRESHOLD ?? 60 * 60 * 1000;
    this.DELETE_INACTIVE_GROUP_INTERVAL =
      state.DELETE_INACTIVE_GROUP_INTERVAL ?? 24 * 60 * 60 * 1000;
    this.continueWhereLeftOff = state.continueWhereLeftOff ?? false;

    this.tabCreationTime.clear();
    this.tabLastInteractionTime.clear();

    (state.tabCreationTime || []).forEach(([key, value]) =>
      this.tabCreationTime.set(parseInt(String(key)), value)
    );
    (state.tabLastInteractionTime || []).forEach(([key, value]) =>
      this.tabLastInteractionTime.set(parseInt(String(key)), value)
    );

    this.logger.info("Restored state:", state);
  }

  private updateLastInteractionTime(tabId: number): void {
    this.tabLastInteractionTime.set(tabId, Date.now());
    this.logger.debug(`Updated last interaction time for tab ${tabId}`);
  }

  private isTabInactive(tabId: number): boolean {
    const lastInteraction = this.tabLastInteractionTime.get(tabId) ?? 0;
    const creationTime = this.tabCreationTime.get(tabId) ?? 0;
    const currentTime = Date.now();

    const isInactive =
      currentTime - lastInteraction > this.INACTIVITY_THRESHOLD &&
      currentTime - creationTime > this.INACTIVITY_THRESHOLD;

    this.logger.debug(`Tab ${tabId} inactive status: ${isInactive}`);
    return isInactive;
  }

  private async findOrCreateInactiveGroup(
    tabIds?: number[]
  ): Promise<number | null> {
    this.logger.debug('Searching for existing "Inactive Tabs" group');
    const groups = await chrome.tabGroups.query({ title: "Inactive Tabs" });

    if (groups.length > 0) {
      this.inactiveGroupId = groups[0].id;
      this.logger.info(
        `Found existing "Inactive Tabs" group with ID: ${this.inactiveGroupId}`
      );
      return this.inactiveGroupId;
    }

    if (tabIds?.length) {
      this.logger.info('"Inactive Tabs" group not found, creating a new one');
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: "Inactive Tabs",
        collapsed: true,
        color: "cyan",
      });
      this.inactiveGroupId = groupId;
      this.inactiveGroupCreationTime = Date.now();
      this.logger.info(
        `Created new "Inactive Tabs" group with ID: ${this.inactiveGroupId}`
      );
      return this.inactiveGroupId;
    }

    this.logger.info('No tabs to group, "Inactive Tabs" group not created');
    return null;
  }

  private async groupTabs(tabIds: number[]): Promise<void> {
    if (tabIds.length === 0) return;

    this.logger.info(`Attempting to group tabs: ${tabIds.join(", ")}`);
    try {
      const groupId = await this.findOrCreateInactiveGroup(tabIds);
      if (groupId) {
        await chrome.tabs.group({ groupId, tabIds });
        this.logger.info(
          `Added tabs to "Inactive Tabs" group with ID: ${groupId}`
        );
      } else {
        this.logger.info("No group created, tabs not grouped");
      }
      await this.saveState();
    } catch (error) {
      this.logger.error("Error grouping tabs:", error);
    }
  }

  private async ungroupTabs(tabIds: number[]): Promise<void> {
    this.logger.info(`Attempting to ungroup tabs: ${tabIds.join(", ")}`);
    try {
      await chrome.tabs.ungroup(tabIds);
      this.logger.info(`Ungrouped tabs: ${tabIds.join(", ")}`);

      if (this.inactiveGroupId) {
        const groupTabs = await chrome.tabs.query({
          groupId: this.inactiveGroupId,
        });
        this.logger.info(
          `Tabs remaining in inactive group: ${groupTabs.length}`
        );
        if (groupTabs.length > 0) {
          await chrome.tabGroups.update(this.inactiveGroupId, {
            collapsed: true,
          });
          this.logger.info(`Collapsed inactive group`);
        } else {
          chrome.tabGroups.move(this.inactiveGroupId, { index: -1 });
          this.inactiveGroupId = null;
          this.inactiveGroupCreationTime = null;
          this.logger.info(
            `Removed empty inactive group and reset inactiveGroupId to null`
          );
        }
        await this.saveState();
      }
    } catch (error) {
      this.logger.error("Error ungrouping tabs:", error);
    }
  }

  private async checkAndUngroupTab(tabId: number): Promise<void> {
    this.logger.debug(`Checking if tab ${tabId} needs to be ungrouped`);
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.groupId === this.inactiveGroupId) {
        this.logger.info(`Ungrouping tab ${tabId}`);
        await this.ungroupTabs([tabId]);
      }
    } catch (error) {
      this.logger.error("Error checking and ungrouping tab:", error);
    }
  }

  private setupTabListeners(): void {
    console.log("Setting up tab listeners");

    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      console.log(`Tab ${activeInfo.tabId} activated`);
      this.updateLastInteractionTime(activeInfo.tabId);
      await this.checkAndUngroupTab(activeInfo.tabId);
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url?.startsWith("http")) {
        await this.injectActivityTracker(tabId);
      }
    });
    //     } catch (error) {
    //       this.logger.error(
    //         `Failed to inject activity tracker in tab ${tabId}:`,
    //         error
    //       );
    //     }
    //   }
    // });

    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.id) {
        console.log(`New tab created with ID ${tab.id}`);
        const currentTime = Date.now();
        this.tabCreationTime.set(tab.id, currentTime);
        this.tabLastInteractionTime.set(tab.id, currentTime);
        this.saveState();
      }
    });

    // Clean up removed tabs
    chrome.tabs.onRemoved.addListener((tabId) => {
      console.log(`Tab ${tabId} removed`);
      this.tabLastInteractionTime.delete(tabId);
      this.tabCreationTime.delete(tabId);
      this.saveState();
    });
  }
  private async injectActivityTracker(tabId: number): Promise<void> {
    const trackerFunction = (): void => {
      let lastActivity = Date.now();
      const ACTIVITY_THRESHOLD = 1000;

      const updateActivity = (): void => {
        const now = Date.now();
        if (now - lastActivity > ACTIVITY_THRESHOLD) {
          lastActivity = now;
          chrome.runtime.sendMessage({ type: "tabActivity", timestamp: now });
        }
      };

      window.addEventListener("mousemove", updateActivity);
      window.addEventListener("keydown", updateActivity);
      window.addEventListener("scroll", updateActivity);
      window.addEventListener("click", updateActivity);
    };
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: trackerFunction,
      } as ScriptInjectionDetails);
    } catch (error) {
      this.logger.error(
        `Failed to inject activity tracker in tab ${tabId}:`,
        error
      );
    }
  }

  // private setupActivityMessageListener(): void {
  //   chrome.runtime.onMessage.addListener((message: any, sender) => {
  //     if (message.type === "tabActivity" && sender.tab?.id) {
  //       this.updateLastInteractionTime(sender.tab.id);
  //       this.saveState();
  //     }
  //   });
  // }

  private async checkTabActivity(): Promise<void> {
    const tabs = await chrome.tabs.query({});
    const currentTime = Date.now();

    for (const tab of tabs) {
      if (!tab.id) continue;

      const lastInteraction = this.tabLastInteractionTime.get(tab.id) || 0;
      const timeSinceInteraction = currentTime - lastInteraction;

      if (timeSinceInteraction > this.INACTIVITY_THRESHOLD) {
        if (tab.groupId !== this.inactiveGroupId) {
          await this.groupInactiveTabs();
        }
      }
    }
  }

  private async groupInactiveTabs(): Promise<void> {
    this.logger.debug("Checking for inactive tabs");

    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      this.logger.info(`Found ${tabs.length} tabs in current window`);

      const inactiveTabs = tabs.filter(
        (tab) => tab.id && this.isTabInactive(tab.id)
      );

      this.logger.info(`Found ${inactiveTabs.length} inactive tabs`);

      if (inactiveTabs.length === 0) {
        this.logger.info("No inactive tabs to group");
        return;
      }

      const tabIdsToGroup = inactiveTabs.map((tab) => tab.id!);
      this.logger.info(`Tabs to group: ${tabIdsToGroup.join(", ")}`);

      if (this.deleteImmediately) {
        await this.deleteInactiveTabs(tabIdsToGroup);
      } else {
        await this.groupTabs(tabIdsToGroup);
      }
    } catch (error) {
      this.logger.error("Error in groupInactiveTabs:", error);
    }

    this.scheduleNextCheck();
  }

  private scheduleNextCheck(): void {
    clearTimeout(this.checkInactiveTabsTimeout);
    this.checkInactiveTabsTimeout = setTimeout(
      () => this.groupInactiveTabs(),
      this.INACTIVITY_THRESHOLD
    );
  }

  private async deleteInactiveTabs(tabIds: number[]): Promise<void> {
    this.logger.info(`Deleting inactive tabs: ${tabIds.join(", ")}`);
    try {
      const tabsToDelete = await Promise.all(
        tabIds.map((tabId) => chrome.tabs.get(tabId))
      );
      this.deletedTabs = tabsToDelete.filter(
        (tab): tab is chrome.tabs.Tab => !!tab
      );
      await chrome.tabs.remove(tabIds);
      this.logger.info(`Deleted inactive tabs: ${tabIds.join(", ")}`);
      this.showDeleteNotification();
    } catch (error) {
      this.logger.error("Error deleting inactive tabs:", error);
    }
  }

  private showDeleteNotification(): void {
    chrome.notifications.create("inactiveTabsDeleted", {
      type: "basic",
      iconUrl: "icon.png",
      title: "Inactive Tabs Deleted",
      message: "Inactive tabs have been deleted. Click to undo.",
      buttons: [{ title: "Undo" }, { title: "Dismiss" }],
      priority: 2,
    });

    setTimeout(() => {
      chrome.notifications.clear("inactiveTabsDeleted");
      this.deletedTabs = [];
    }, this.UNDO_TIMEOUT);
  }

  private async undoTabDeletion(): Promise<void> {
    this.logger.info("Undoing tab deletion");
    try {
      for (const tab of this.deletedTabs) {
        await chrome.tabs.create({
          url: tab.url,
          pinned: tab.pinned,
          index: tab.index,
        });
      }
      this.logger.info("Restored deleted tabs");
      this.deletedTabs = [];
    } catch (error) {
      this.logger.error("Error undoing tab deletion:", error);
    }
  }

  private checkPermissions(): void {
    chrome.permissions.contains(
      {
        permissions: ["tabs", "tabGroups", "storage", "notifications"],
      },
      (result) => {
        if (result) {
          this.logger.info("The extension has the necessary permissions.");
        } else {
          this.logger.error("The extension is missing necessary permissions.");
        }
      }
    );
  }

  private async handleWindowClose(windowId: number): Promise<void> {
    this.logger.info(`Window ${windowId} closing, saving state`);
    await Promise.all([this.saveState(), this.saveSession()]);
  }

  private async handleWindowOpen(window: chrome.windows.Window): Promise<void> {
    this.logger.info(`Window ${window.id} opened, restoring state`);
    await this.restoreState();
    await this.groupInactiveTabs();
  }

  private async deleteInactiveGroupIfExpired(): Promise<void> {
    this.logger.debug("Checking if inactive group should be deleted");
    if (this.inactiveGroupId && this.inactiveGroupCreationTime) {
      const currentTime = Date.now();
      if (
        currentTime - this.inactiveGroupCreationTime >=
        this.DELETE_INACTIVE_GROUP_INTERVAL
      ) {
        this.logger.info(
          "Inactive group has expired. Deleting it and its tabs."
        );
        try {
          const groupTabs = await chrome.tabs.query({
            groupId: this.inactiveGroupId,
          });
          const tabIds = groupTabs.map((tab) => tab.id!);

          this.deletedTabs = groupTabs;
          await Promise.all([
            chrome.tabs.remove(tabIds),
            // Using move with an empty array effectively removes the group
            chrome.tabGroups.move(this.inactiveGroupId, { index: -1 }),
          ]);

          this.inactiveGroupId = null;
          this.inactiveGroupCreationTime = null;
          this.logger.info("Inactive group and its tabs deleted successfully");
          await this.saveState();
          this.showDeleteNotification();
        } catch (error) {
          this.logger.error(
            "Error deleting inactive group and its tabs:",
            error
          );
        }
      } else {
        this.logger.debug("Inactive group has not expired yet");
      }
    } else {
      this.logger.debug("No inactive group to delete");
    }
  }

  private async saveSession(): Promise<void> {
    if (this.continueWhereLeftOff) {
      const windows = await chrome.windows.getAll({ populate: true });
      const session: SavedWindow[] = windows.map((window) => ({
        tabs: (window.tabs || []).map((tab) => ({
          url: tab.url || "",
          pinned: tab.pinned || false,
          active: tab.active || false,
        })),
      }));
      await chrome.storage.local.set({ savedSession: session });
      this.logger.info("Session saved:", session);
    }
  }

  private async restoreSession(): Promise<void> {
    if (this.continueWhereLeftOff) {
      const result = await chrome.storage.local.get("savedSession");
      const savedSession = result.savedSession as SavedWindow[] | undefined;
      if (savedSession) {
        for (const window of savedSession) {
          if (window.tabs.length > 0) {
            const newWindow = await chrome.windows.create({
              url: window.tabs[0].url,
            });
            for (let i = 1; i < window.tabs.length; i++) {
              const tab = window.tabs[i];
              await chrome.tabs.create({
                windowId: newWindow.id,
                url: tab.url,
                pinned: tab.pinned,
                active: tab.active,
              });
            }
          }
        }
        this.logger.info("Session restored");
      }
    }
  }

  private updateSettings(settings: TabFlowSettings): void {
    this.logger.info("Updating settings:", settings);

    // Clear existing intervals before updating settings
    this.clearIntervals();

    this.INACTIVITY_THRESHOLD = settings.inactiveTime * 60 * 1000;
    this.deleteImmediately = settings.action === "delete";
    this.deleteInactiveGroup = settings.deleteInactiveGroup;
    this.DELETE_INACTIVE_GROUP_INTERVAL = settings.groupDeleteTime * 60 * 1000;
    this.continueWhereLeftOff = settings.continueWhereLeftOff;

    this.logger.info(`New INACTIVITY_THRESHOLD: ${this.INACTIVITY_THRESHOLD}`);
    this.logger.info(`New deleteImmediately: ${this.deleteImmediately}`);
    this.logger.info(`New deleteInactiveGroup: ${this.deleteInactiveGroup}`);
    this.logger.info(
      `New DELETE_INACTIVE_GROUP_INTERVAL: ${this.DELETE_INACTIVE_GROUP_INTERVAL}`
    );
    this.logger.info(`New continueWhereLeftOff: ${this.continueWhereLeftOff}`);

    this.saveState();

    // Update all tabs' last interaction time
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) this.updateLastInteractionTime(tab.id);
      });
    });

    // Set up new intervals with updated settings
    this.activityCheckInterval = setInterval(
      () => this.checkTabActivity(),
      this.ACTIVITY_CHECK_INTERVAL
    );

    this.scheduleNextCheck();

    if (this.deleteInactiveGroup) {
      this.deleteInactiveGroupInterval = setInterval(
        () => this.deleteInactiveGroupIfExpired(),
        this.DELETE_INACTIVE_GROUP_INTERVAL
      );
    }
  }

  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener(
      (
        message: RuntimeMessage,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: MessageResponse) => void
      ) => {
        switch (message.type) {
          case "updateSettings":
            this.updateSettings(message.settings);
            sendResponse({ success: true });
            break;

          case "getSettings":
            sendResponse({
              action: this.deleteImmediately ? "delete" : "group",
              inactiveTime: this.INACTIVITY_THRESHOLD / (60 * 1000),
              deleteInactiveGroup: this.deleteInactiveGroup,
              groupDeleteTime:
                this.DELETE_INACTIVE_GROUP_INTERVAL / (60 * 1000),
              continueWhereLeftOff: this.continueWhereLeftOff,
            });
            break;

          case "manualCleanup":
            this.logger.info("Manual cleanup initiated");
            this.groupInactiveTabs()
              .then(() => {
                sendResponse({ success: true });
              })
              .catch((error: Error) => {
                this.logger.error("Error during manual cleanup:", error);
                sendResponse({ success: false, error: error.message });
              });
            return true;

          case "getTabCounts":
            chrome.tabs.query({}, (tabs) => {
              const inactiveTabs = tabs.filter(
                (tab) => tab.id && this.isTabInactive(tab.id)
              );
              const counts: TabCounts = {
                totalTabs: tabs.length,
                inactiveTabs: inactiveTabs.length,
                activeTabs: tabs.length - inactiveTabs.length,
              };
              sendResponse(counts);
            });
            return true;
        }
        return true;
      }
    );
  }

  private setupNotificationListeners(): void {
    chrome.notifications.onButtonClicked.addListener(
      (notificationId: string, buttonIndex: number) => {
        if (notificationId === "inactiveTabsDeleted") {
          if (buttonIndex === 0) {
            this.undoTabDeletion();
          }
          chrome.notifications.clear(notificationId);
        }
      }
    );
  }

  private async setupInstallListener(): Promise<void> {
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === "install" || details.reason === "update") {
        const result = await chrome.storage.local.get([
          "action",
          "inactiveTime",
          "deleteInactiveGroup",
          "groupDeleteTime",
          "continueWhereLeftOff",
        ]);

        if (
          !result.action ||
          !result.inactiveTime ||
          result.deleteInactiveGroup === undefined ||
          !result.groupDeleteTime ||
          result.continueWhereLeftOff === undefined
        ) {
          const defaultSettings: TabFlowSettings = {
            action: "group",
            inactiveTime: 60,
            deleteInactiveGroup: false,
            groupDeleteTime: 180,
            continueWhereLeftOff: false,
          };
          await chrome.storage.local.set(defaultSettings);
          this.logger.info("Default settings applied:", defaultSettings);
          this.updateSettings(defaultSettings);
        } else {
          this.updateSettings({
            action: result.action,
            inactiveTime: result.inactiveTime,
            deleteInactiveGroup: result.deleteInactiveGroup,
            groupDeleteTime: result.groupDeleteTime,
            continueWhereLeftOff: result.continueWhereLeftOff,
          });
        }
      }
    });
  }

  private clearIntervals(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = undefined;
    }
    if (this.deleteInactiveGroupInterval) {
      clearInterval(this.deleteInactiveGroupInterval);
      this.deleteInactiveGroupInterval = undefined;
    }
    if (this.checkInactiveTabsTimeout) {
      clearTimeout(this.checkInactiveTabsTimeout);
      this.checkInactiveTabsTimeout = undefined;
    }
  }

  private async init(): Promise<void> {
    await this.setupInstallListener();
    await this.restoreState();

    // Load settings from storage
    const result = await chrome.storage.local.get([
      "action",
      "inactiveTime",
      "deleteInactiveGroup",
      "groupDeleteTime",
      "continueWhereLeftOff",
    ]);

    const settings: TabFlowSettings = {
      action: result.action || "group",
      inactiveTime: result.inactiveTime || 60,
      deleteInactiveGroup: result.deleteInactiveGroup || false,
      groupDeleteTime: result.groupDeleteTime || 180,
      continueWhereLeftOff: result.continueWhereLeftOff || false,
    };

    this.updateSettings(settings);

    // Initialize all current tabs with current timestamp
    const tabs = await chrome.tabs.query({});
    const currentTime = Date.now();
    tabs.forEach((tab) => {
      if (tab.id) {
        this.tabCreationTime.set(tab.id, currentTime);
        this.tabLastInteractionTime.set(tab.id, currentTime);
      }
    });

    // if (
    //   result.action &&
    //   result.inactiveTime &&
    //   result.deleteInactiveGroup !== undefined &&
    //   result.groupDeleteTime &&
    //   result.continueWhereLeftOff !== undefined
    // ) {
    //   this.updateSettings({
    //     action: result.action,
    //     inactiveTime: result.inactiveTime,
    //     deleteInactiveGroup: result.deleteInactiveGroup,
    //     groupDeleteTime: result.groupDeleteTime,
    //     continueWhereLeftOff: result.continueWhereLeftOff,
    //   });
    // }
    this.setupTabListeners();
    this.setupMessageListeners();
    this.setupNotificationListeners();
    this.setupActivityMessageListener();
    this.checkPermissions();

    // Set up regular activity checking
    this.activityCheckInterval = setInterval(
      () => this.checkTabActivity(),
      this.ACTIVITY_CHECK_INTERVAL
    );

    if (this.deleteInactiveGroup) {
      this.deleteInactiveGroupInterval = setInterval(
        () => this.deleteInactiveGroupIfExpired(),
        this.DELETE_INACTIVE_GROUP_INTERVAL
      );
    }

    chrome.windows.onRemoved.addListener((windowId) =>
      this.handleWindowClose(windowId)
    );
    chrome.windows.onCreated.addListener((window) =>
      this.handleWindowOpen(window)
    );

    if (this.continueWhereLeftOff) {
      await this.restoreSession();
    }

    await this.saveState();
  }
}

// Initialize the extension
new TabFlowManager();
