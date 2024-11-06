/* global chrome */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  XMarkIcon,
  HomeIcon,
  WrenchIcon,
  CogIcon,
} from "@heroicons/react/24/solid";

const Setting = ({ setView }) => {
  const [action, setAction] = useState("group");
  const [inactiveTime, setInactiveTime] = useState(60);
  const [deleteInactiveGroup, setDeleteInactiveGroup] = useState(false);
  const [groupDeleteTime, setGroupDeleteTime] = useState(180);

  useEffect(() => {
    chrome.storage.local.get(
      ["action", "inactiveTime", "deleteInactiveGroup", "groupDeleteTime"],
      (result) => {
        if (result.action) setAction(result.action);
        if (result.inactiveTime) setInactiveTime(result.inactiveTime);
        if (result.deleteInactiveGroup !== undefined)
          setDeleteInactiveGroup(result.deleteInactiveGroup);
        if (result.groupDeleteTime) setGroupDeleteTime(result.groupDeleteTime);
      }
    );
  }, []);

  useEffect(() => {
    chrome.storage.local.set({
      action,
      inactiveTime,
      deleteInactiveGroup,
      groupDeleteTime,
    });
    chrome.runtime.sendMessage({
      type: "updateSettings",
      settings: { action, inactiveTime, deleteInactiveGroup, groupDeleteTime },
    });
  }, [action, inactiveTime, deleteInactiveGroup, groupDeleteTime]);

  const handleClose = () => {
    window.close();
  };

  const handleHomeClick = () => {
    setView("home");
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex justify-between items-center bg-primary text-white py-4 px-6">
        <div className="flex items-center space-x-3">
          <img src="/icon-48px.png" alt="TabFlow Logo" className="w-6 h-6" />
          <h1 className="text-xl font-bold">TabFlow</h1>
        </div>
        <XMarkIcon
          className="w-6 h-6 cursor-pointer hover:text-gray-300 transition-colors"
          onClick={handleClose}
        />
      </header>
      <main className="flex-1 bg-secondary px-8 py-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Tab Settings</h2>
        <div className="mb-6">
          <p className="font-semibold mb-2">Inactive Threshold</p>
          <div className="flex items-center justify-between">
            <span className="font-bold">Inactive Tab Timeout (minutes):</span>
            <span className="text-lg font-bold">{inactiveTime}</span>
          </div>
          <input
            id="inactiveSlider"
            type="range"
            min="5"
            max="120"
            value={inactiveTime}
            onChange={(e) => setInactiveTime(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <div className="mb-6">
          <p className="font-semibold mb-2">
            Choose what happens when a tab is inactive:
          </p>
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="group"
                name="tabAction"
                value="group"
                checked={action === "group"}
                onChange={() => setAction("group")}
                className="h-5 w-5 text-primary"
              />
              <label
                htmlFor="group"
                className="cursor-pointer text-lg font-medium"
              >
                Group inactive tabs
              </label>
            </div>
            {action === "group" && (
              <div className="ml-8">
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="deleteInactiveGroup"
                    checked={deleteInactiveGroup}
                    onChange={(e) => setDeleteInactiveGroup(e.target.checked)}
                    className="h-5 w-5 text-primary"
                  />
                  <label
                    htmlFor="deleteInactiveGroup"
                    className="cursor-pointer text-lg font-medium"
                  >
                    Delete inactive group after a threshold
                  </label>
                </div>
                {deleteInactiveGroup && (
                  <div>
                    <p className="font-semibold mb-2">
                      Group Deletion Threshold (minutes): {groupDeleteTime}
                    </p>
                    <input
                      id="groupDeleteSlider"
                      type="range"
                      min="60"
                      max="1440"
                      value={groupDeleteTime}
                      onChange={(e) =>
                        setGroupDeleteTime(Number(e.target.value))
                      }
                      className="w-full accent-primary"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="delete"
                name="tabAction"
                value="delete"
                checked={action === "delete"}
                onChange={() => setAction("delete")}
                className="h-5 w-5 text-primary"
              />
              <label
                htmlFor="delete"
                className="cursor-pointer text-lg font-medium"
              >
                Delete inactive tabs immediately
              </label>
            </div>
          </div>
        </div>
      </main>
      <div className="w-[100%] h-[70px] flex">
        <div
          className="w-[50%] h-[100%] flex items-center justify-center border-t border-b border-primary bg-white cursor-pointer hover:bg-secondary transition-colors duration-[0.5s]"
          onClick={handleHomeClick}
        >
          <HomeIcon className="w-6 h-6 text-primary" />
        </div>
        <div
          id="settings"
          className="w-[50%] h-[100%] bg-primary flex items-center justify-center cursor-pointer"
        >
          <CogIcon className="w-6 h-6 text-white" />
        </div>
      </div>
      <footer className="flex justify-between items-center bg-gray-100 py-4 px-6">
        <div className="flex items-center space-x-2">
          <WrenchIcon className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-500">
            Pro Tip: Pin the extension for easy access to control
          </p>
        </div>
        <a
          href="https://github.com/Hybk/TabFlow-Extention"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline text-sm font-medium"
        >
          Github
        </a>
      </footer>
    </div>
  );
};

Setting.propTypes = {
  setView: PropTypes.func.isRequired,
};

export default Setting;
