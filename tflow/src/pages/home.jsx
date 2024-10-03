/* global chrome */

import { useState, useEffect } from "react";
import Logo from "/icon-48px.png";
import {
  XMarkIcon,
  TrashIcon,
  HomeIcon,
  CogIcon,
  WrenchIcon,
} from "@heroicons/react/24/solid";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import Settings from "./setting";

const Home = () => {
  const [view, setView] = useState("home");
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tabData, setTabData] = useState({
    totalTabs: 0,
    activeTabs: 0,
    inactiveTabs: 0,
  });

  const fetchTabData = () => {
    chrome.runtime.sendMessage({ type: "getTabCounts" }, (response) => {
      if (response) {
        setTabData(response);
      }
    });
  };

  useEffect(() => {
    fetchTabData();

    const messageListener = (message) => {
      if (message.type === "updatePieChart") {
        setTabData(message.data);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const handleClose = () => {
    window.close();
  };

  const getCellStyle = (index) => ({
    transform: index === hoveredIndex ? "scale(1.1)" : "scale(1)",
    transition: "transform 0.3s ease-in-out",
    transformOrigin: "center",
  });

  const handleSettingsClick = () => {
    setView("settings");
  };

  const handleCleanup = () => {
    chrome.runtime.sendMessage({ type: "manualCleanup" }, (response) => {
      if (response && response.success) {
        console.log("Cleanup successful");
        fetchTabData(); // Refresh the tab data immediately after cleanup
      } else {
        console.error(
          "Cleanup failed:",
          response ? response.error : "Unknown error"
        );
      }
    });
  };

  if (view === "settings") {
    return <Settings />;
  }

  const outerData = [{ name: "Total", value: tabData.totalTabs }];
  const innerData = [
    { name: "Active Tabs", value: tabData.activeTabs },
    { name: "Inactive Tabs", value: tabData.inactiveTabs },
  ];

  return (
    <div className="w-full h-[auto] bg-secondary">
      <div className="flex justify-between bg-white h-16 px-6 items-center">
        <div className="flex items-center space-x-3">
          <img src={Logo} alt="TabFlow Logo" className="w-6 h-6" />
          <h1 className="text-xl font-bold">TabFlow</h1>
        </div>
        <XMarkIcon className="w-6 h-6 cursor-pointer" onClick={handleClose} />
      </div>
      <div className="flex flex-col items-center justify-center space-y-7 w-full py-7">
        <h2 className="text-lg font-bold w-1/3 text-center">Tab Overview</h2>
        <div className="h-px w-4/5 bg-gray-300"></div>
      </div>
      <div className="flex justify-center items-center m-[auto] px-4">
        <div className="flex justify-center">
          <PieChart width={250} height={250} className="self-start">
            <Pie
              data={outerData}
              dataKey="value"
              cx={125}
              cy={125}
              innerRadius={50}
              outerRadius={75}
              fill="#FFA500"
              stroke="none"
            />
            <Pie
              data={innerData}
              dataKey="value"
              cx={125}
              cy={125}
              innerRadius={0}
              outerRadius={40}
              stroke="none"
            >
              {innerData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 1 ? "#82ca9d" : "#8884d8"}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={getCellStyle(index)}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>
        <div className="flex flex-col justify-center space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-[10px] h-[10px] rounded-full bg-[#FFA500]"></div>
            <p className="font-bold text-[15px]">
              Total Tabs: {tabData.totalTabs}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-[10px] h-[10px] rounded-full bg-[#82ca9d]"></div>
            <p className="font-bold text-[15px]">
              Inactive Tabs: {tabData.inactiveTabs}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-[10px] h-[10px] rounded-full bg-[#8884d8]"></div>
            <p className="font-bold text-[15px]">
              Active Tabs: {tabData.activeTabs}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between p-[2rem]">
        <div className="w-[60%]">
          <h1 className="font-bold text-[13px]">DO YOU KNOW?</h1>
          <p className="text-[11px]">
            Managing your tabs reduces memory usage, boosts system performance,
            and makes browsing faster and smoother!
          </p>
        </div>
        <button
          className="flex items-center space-x-2 border border-primary rounded-full bg-white py-3 px-4 hover:bg-primary hover:text-white transition-colors duration-[0.5s]"
          onClick={handleCleanup}
        >
          <TrashIcon className="h-5 w-5" />
          <span className="font-semibold">Clean up</span>
        </button>
      </div>
      <div className="w-[100%] h-[70px] flex">
        <div className="w-[50%] h-[100%] bg-primary flex items-center justify-center cursor-pointer">
          <HomeIcon className="w-6 h-6 text-white" />
        </div>
        <div
          id="settings"
          className="w-[50%] h-[100%] flex items-center justify-center border-t border-b border-primary bg-white cursor-pointer hover:bg-secondary transition-colors duration-[0.5s]"
          onClick={handleSettingsClick}
        >
          <CogIcon className="w-6 h-6" />
        </div>
      </div>
      <footer className="flex justify-between items-center p-3 bg-white">
        <div className="flex items-center space-x-1">
          <WrenchIcon className="w-4 h-4" />
          <p className="text-xs font-semibold">
            Pro Tip: Pin the extension for easy access to control
          </p>
        </div>
        <a
          href="https://github.com/Hybk/TabFlow-Extention"
          target="_blank"
          rel="noopener noreferrer"
          className="text-black underline text-xs"
        >
          Github
        </a>
      </footer>
    </div>
  );
};

export default Home;
