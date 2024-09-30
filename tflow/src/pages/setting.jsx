/* global chrome */

import { useState, useEffect } from "react";
import Logo from "/icon-48px.png";
import { XMarkIcon } from "@heroicons/react/24/solid";

const Setting = () => {
  const [action, setAction] = useState("group");
  const [inactiveTime, setInactiveTime] = useState(60);
  const [groupTime, setGroupTime] = useState(180);

  useEffect(() => {
    chrome.storage.local.get(
      ["action", "inactiveTime", "groupTime"],
      (result) => {
        if (result.action) setAction(result.action);
        if (result.inactiveTime) setInactiveTime(result.inactiveTime);
        if (result.groupTime) setGroupTime(result.groupTime);
      }
    );
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ action, inactiveTime, groupTime });
    chrome.runtime.sendMessage({
      type: "updateSettings",
      settings: { action, inactiveTime, groupTime },
    });
  }, [action, inactiveTime, groupTime]);

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="w-full h-[auto] bg-secondary">
      <header className="flex justify-between bg-white h-16 px-6 items-center">
        <div className="flex items-center space-x-3">
          <img src={Logo} alt="TabFlow Logo" className="w-6 h-6" />
          <h1 className="text-xl font-bold">TabFlow</h1>
        </div>
        <XMarkIcon className="w-6 h-6 cursor-pointer" onClick={handleClose} />
      </header>
      <div className="flex flex-col items-center justify-center space-y-7 w-full py-7">
        <h2 className="text-lg font-bold w-1/3 text-center">Tab Settings</h2>
        <div className="h-px w-4/5 bg-gray-300"></div>
      </div>
      <div className="p-5">
        <p>Inactive Threshold</p>
        <div className="mb-5">
          <label htmlFor="inactiveSlider" className="font-bold">
            Inactive Tab Timeout (minutes): {inactiveTime}
          </label>
          <input
            id="inactiveSlider"
            type="range"
            min="5"
            max="120"
            value={inactiveTime}
            onChange={(e) => setInactiveTime(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
      <div className="p-5">
        <div className="mb-5">
          <p className="font-bold mb-3">
            Choose what happens when a tab is inactive:
          </p>
          <div className="flex flex-col mb-2">
            <div className="flex">
              <input
                type="radio"
                id="group"
                name="tabAction"
                value="group"
                checked={action === "group"}
                onChange={() => setAction("group")}
                className="mr-2"
              />
              <label htmlFor="group" className="cursor-pointer">
                Group inactive tabs
              </label>
            </div>
            {action === "group" && (
              <div>
                <div className="mb-5">
                  <label htmlFor="groupSlider" className="font-bold">
                    Grouped Tab Stay Time (minutes): {groupTime}
                  </label>
                  <input
                    id="groupSlider"
                    type="range"
                    min="60"
                    max="240"
                    value={groupTime}
                    onChange={(e) => setGroupTime(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center mb-5">
            <input
              type="radio"
              id="delete"
              name="tabAction"
              value="delete"
              checked={action === "delete"}
              onChange={() => setAction("delete")}
              className="mr-2"
            />
            <label htmlFor="delete" className="cursor-pointer">
              Delete inactive tabs immediately
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;
