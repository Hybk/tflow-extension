import Logo from "/icon-48px.png";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { TabAction } from "../enums";

const handleClose = () => {
  window.close();
};

function Setting() {
  const [action, setAction] = useState<TabAction>(TabAction.GROUP); // default to grouping
  const [inactiveTime, setInactiveTime] = useState(60); // default: 60 mins
  const [groupTime, setGroupTime] = useState(180); // default: 180 mins

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
      <div>
        <p>Inactive Threshold</p>

        {/* Inactive Time Slider */}
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
            onChange={(e) => setInactiveTime(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
      <div className="p-5">
        {/* Option for Tab Management */}
        <div className="mb-5">
          <p className="font-bold mb-3">
            Choose what happens when a tab is inactive:
          </p>

          {/* Option 1: Group tabs */}
          <div className="flex flex-col mb-2">
            <div className="flex">
              <input
                type="radio"
                id="group"
                name="tabAction"
                value="group"
                checked={action === TabAction.GROUP}
                onChange={() => setAction(TabAction.GROUP)}
                className="mr-2"
              />
              <label htmlFor="group" className="cursor-pointer">
                Group inactive tabs
              </label>
            </div>

            {/* Show range sliders only if "Group inactive tabs" is selected */}
            {action === TabAction.GROUP && (
              <div>
                {/* Grouped Tab Stay Time Slider */}
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
                    onChange={(e) => setGroupTime(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Delete tabs */}
          <div className="flex items-center mb-5">
            <input
              type="radio"
              id="delete"
              name="tabAction"
              value="delete"
              checked={action === TabAction.DELETE}
              onChange={() => setAction(TabAction.DELETE)}
              className="mr-2"
            />
            <label htmlFor="delete" className="cursor-pointer">
              Delete inactive tabs immediately
            </label>
          </div>
        </div>
      </div>
      {
        /* <div className="p-5">
        <h2 className="text-lg font-bold mb-4">Advance Settings</h2>

        <div className="mb-5 flex items-center justify-between">
          <span>Disable/Enable “Undo” Prompt</span>
          <button
            className={`px-4 py-2 ${
              undoPromptEnabled ? "bg-red-500" : "bg-gray-300"
            } text-white rounded`}
            onClick={toggleUndoPrompt}
          >
            {undoPromptEnabled ? "Disable" : "Enable"}
          </button>
        </div>


        <div className="mb-5 flex items-center justify-between">
          <span>Disable/Enable notification alert</span>
          <button
            className={`px-4 py-2 ${
              notificationsEnabled ? "bg-red-500" : "bg-gray-300"
            } text-white rounded`}
            onClick={toggleNotifications}
          >
            {notificationsEnabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div> */
      }
    </div>
  );
}

export default Setting;
