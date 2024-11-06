import React, { useState, useEffect } from "react";
import {
  CogIcon,
  HomeIcon,
  WrenchIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

import { TabAction } from "../enums";
import Logo from "/icon-48px.png";
import Home from "./Home";

enum Page {
  HOME = "HOME",
  SETTINGS = "SETTINGS",
}

// Card Components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
);

const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <h3
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
  >
    {children}
  </h3>
);

const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

// Interface for settings
interface TabFlowSettings {
  action: TabAction;
  inactiveTime: number;
  deleteInactiveGroup: boolean;
  groupDeleteTime: number;
  continueWhereLeftOff: boolean;
}

interface RuntimeMessage {
  type: string;
  settings?: TabFlowSettings;
}

const DEFAULT_SETTINGS: TabFlowSettings = {
  action: TabAction.GROUP,
  inactiveTime: 60,
  deleteInactiveGroup: false,
  groupDeleteTime: 180,
  continueWhereLeftOff: true,
};

const Setting: React.FC = () => {
  // State management with proper typing
  const [settings, setSettings] = useState<TabFlowSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<Page>(Page.SETTINGS);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "getSettings",
        });
        if (response) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...response,
            action: response.action as TabAction,
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Save settings with debounce
  useEffect(() => {
    if (!isSaving) return;

    const saveSettings = async () => {
      try {
        const message: RuntimeMessage = {
          type: "updateSettings",
          settings: settings,
        };
        await chrome.runtime.sendMessage(message);
        console.log("Settings saved successfully");
      } catch (error) {
        console.error("Error saving settings:", error);
      } finally {
        setIsSaving(false);
      }
    };

    const timeoutId = setTimeout(saveSettings, 500);
    return () => clearTimeout(timeoutId);
  }, [settings, isSaving]);

  // Update settings handler with proper typing
  const updateSettings = (updates: Partial<TabFlowSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    setIsSaving(true);
  };

  const handleSettingsClick = (): void => {
    setPage(Page.HOME);
  };

  if (page === Page.HOME) {
    return <Home />;
  }

  // const handleClose = () => {
  //   window.close();
  // };

  return (
    <div className="w-full h-[auto] bg-gray-50">
      <header className="flex justify-between bg-white h-16 px-6 items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <img src={Logo} alt="TabFlow Logo" className="w-6 h-6" />
          <h1 className="text-xl font-bold text-gray-900">TabFlow</h1>
        </div>
        <XMarkIcon
          className="w-6 h-6 cursor-pointer hover:text-gray-600 transition-colors"
          onClick={() => window.close()}
        />
      </header>

      <main className="container mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Tab Management Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="inactiveSlider"
                  className="block font-medium text-gray-700"
                >
                  Inactive Tab Timeout
                </label>
                <span className="text-sm font-medium text-primary">
                  {settings.inactiveTime} minutes
                </span>
              </div>
              <input
                id="inactiveSlider"
                type="range"
                min="5"
                max="120"
                value={settings.inactiveTime}
                onChange={(e) =>
                  updateSettings({ inactiveTime: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>5 min</span>
                <span>120 min</span>
              </div>
            </div>

            {/* Tab Action Settings */}
            <div className="space-y-3">
              <p className="font-medium text-gray-700">
                Choose what happens when a tab is inactive:
              </p>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                  <input
                    type="radio"
                    name="tabAction"
                    checked={settings.action === TabAction.GROUP}
                    onChange={() => updateSettings({ action: TabAction.GROUP })}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-gray-900">Group inactive tabs</span>
                </label>

                {settings.action === TabAction.GROUP && (
                  <div className="ml-7 space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label
                          htmlFor="groupSlider"
                          className="block text-sm text-gray-700"
                        >
                          Group deletion time
                        </label>
                        <span className="text-sm text-primary">
                          {settings.groupDeleteTime} minutes
                        </span>
                      </div>
                      <input
                        id="groupSlider"
                        type="range"
                        min="60"
                        max="240"
                        value={settings.groupDeleteTime}
                        onChange={(e) =>
                          updateSettings({
                            groupDeleteTime: parseInt(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>60 min</span>
                        <span>240 min</span>
                      </div>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.deleteInactiveGroup}
                        onChange={(e) =>
                          updateSettings({
                            deleteInactiveGroup: e.target.checked,
                          })
                        }
                        className="rounded text-primary w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">
                        Automatically delete inactive groups
                      </span>
                    </label>
                  </div>
                )}

                <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                  <input
                    type="radio"
                    name="tabAction"
                    checked={settings.action === TabAction.DELETE}
                    onChange={() =>
                      updateSettings({ action: TabAction.DELETE })
                    }
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-gray-900">
                    Delete inactive tabs immediately
                  </span>
                </label>
              </div>
            </div>

            {/* Continue Where Left Off Setting */}
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.continueWhereLeftOff}
                  onChange={(e) =>
                    updateSettings({ continueWhereLeftOff: e.target.checked })
                  }
                  className="rounded text-primary w-4 h-4"
                />
                <span className="text-gray-900">
                  Continue where you left off when reopening browser
                </span>
              </label>
            </div>
          </CardContent>
        </Card>
      </main>

      <div className="w-full h-[70px] flex">
        <div
          id="settings"
          className="w-1/2 h-full flex items-center justify-center border-t border-b border-primary bg-white cursor-pointer hover:bg-gray-50 transition-colors duration-500"
          onClick={handleSettingsClick}
        >
          <HomeIcon className="w-6 h-6 text-gray-600" />
        </div>
        <div className="w-1/2 h-full bg-primary flex items-center justify-center cursor-pointer">
          <CogIcon className="w-6 h-6 text-white" />
        </div>
      </div>

      <footer className="flex justify-between items-center p-3 bg-white">
        <div className="flex items-center space-x-2">
          <WrenchIcon className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-600">
            Pro Tip: Pin the extension for easy access to control
          </p>
        </div>
        <a
          href="https://github.com/Hybk/TabFlow-Extention"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-dark text-xs underline transition-colors"
        >
          Github
        </a>
      </footer>
    </div>
  );
};

export default Setting;
