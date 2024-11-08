import { useState, useEffect } from "react";
import Logo from "/icon-48px.png";
import {
  CogIcon,
  HomeIcon,
  TrashIcon,
  WrenchIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import Settings from "./Settings";
import { Page } from "../enums";

interface TabCounts {
  totalTabs: number;
  inactiveTabs: number;
  activeTabs: number;
}

interface SettingsProps {
  onBack: () => void;
}

// Card Components remain the same...
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

interface ChartDataItem {
  name: string;
  value: number;
}

// Create a TabManager component to handle tab-related state and logic
const TabManager: React.FC<{
  children: (props: {
    tabCounts: TabCounts;
    getTabCounts: () => Promise<void>;
    handleManualCleanup: () => Promise<void>;
  }) => React.ReactNode;
}> = ({ children }) => {
  const [tabCounts, setTabCounts] = useState<TabCounts>({
    totalTabs: 0,
    inactiveTabs: 0,
    activeTabs: 0,
  });

  const getTabCounts = async () => {
    try {
      const counts = await new Promise<TabCounts>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "getTabCounts" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
          } else {
            resolve(response);
          }
        });
      });
      setTabCounts(counts);
    } catch (error) {
      console.error("Error getting tab counts:", error);
    }
  };

  const handleManualCleanup = async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "manualCleanup" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
          } else if (response.success) {
            resolve();
          } else {
            reject(response.error);
          }
        });
      });
      getTabCounts();
    } catch (error) {
      console.error("Error during manual cleanup:", error);
    }
  };

  useEffect(() => {
    getTabCounts();

    // Add listener for tab updates
    const handleTabUpdate = () => {
      getTabCounts();
    };

    chrome.tabs.onCreated.addListener(handleTabUpdate);
    chrome.tabs.onRemoved.addListener(handleTabUpdate);
    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    return () => {
      chrome.tabs.onCreated.removeListener(handleTabUpdate);
      chrome.tabs.onRemoved.removeListener(handleTabUpdate);
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    };
  }, []);

  return children({ tabCounts, getTabCounts, handleManualCleanup });
};

const Home: React.FC<SettingsProps> = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [page, setPage] = useState<Page>(Page.HOME);

  const getCellStyle = (index: number): React.CSSProperties => ({
    transform: index === hoveredIndex ? "scale(1.1)" : "scale(1)",
    transition: "transform 0.3s ease-in-out",
    transformOrigin: "center",
  });

  const handleSettingsClick = (): void => {
    setPage(Page.SETTINGS);
  };

  if (page === Page.SETTINGS) {
    return <Settings onBack={() => setPage(Page.HOME)} />;
  }

  return (
    <TabManager>
      {({ tabCounts, handleManualCleanup }) => {
        const outerData: ChartDataItem[] = [{ name: "Total", value: 100 }];
        const innerData: ChartDataItem[] = [
          { name: "Active Tabs", value: tabCounts.activeTabs },
          { name: "Inactive Tabs", value: tabCounts.inactiveTabs },
        ];

        return (
          <div className="w-full h-auto bg-gray-50">
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
                  <CardTitle>Tab Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center gap-8 mb-6">
                    <div className="flex justify-center">
                      <PieChart width={250} height={250} className="self-start">
                        <Pie
                          data={outerData}
                          dataKey="value"
                          cx={125}
                          cy={125}
                          innerRadius={50}
                          outerRadius={75}
                          fill="#7C3AED"
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
                          {innerData.map((_, index) => (
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
                    <div className="flex flex-col justify-center space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-[#7C3AED]"></div>
                          <p className="text-sm font-medium text-gray-700">
                            Total Tabs({tabCounts.totalTabs})
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-[#82ca9d]"></div>
                          <p className="text-sm font-medium text-gray-700">
                            Inactive Tabs ({tabCounts.inactiveTabs})
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-[#8884d8]"></div>
                          <p className="text-sm font-medium text-gray-700">
                            Active Tabs ({tabCounts.activeTabs})
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border-t border-gray-200">
                    <div className="w-[60%]">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        DID YOU KNOW?
                      </h3>
                      <p className="text-sm text-gray-600">
                        Managing your tabs reduces memory usage, boosts system
                        performance, and makes browsing faster and smoother!
                      </p>
                    </div>
                    <button
                      className="flex items-center space-x-2 bg-primary text-white rounded-lg py-2 px-4 hover:bg-primary/90 transition-colors duration-200"
                      onClick={handleManualCleanup}
                    >
                      <TrashIcon className="h-5 w-5" />
                      <span className="font-medium">Clean up</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </main>

            <div className="w-full h-[70px] flex">
              <div className="w-1/2 h-full bg-primary flex items-center justify-center cursor-pointer">
                <HomeIcon className="w-6 h-6 text-white" />
              </div>
              <div
                className="w-1/2 h-full flex items-center justify-center border-t border-b border-primary bg-white cursor-pointer hover:bg-gray-50 transition-colors duration-500"
                onClick={handleSettingsClick}
              >
                <CogIcon className="w-6 h-6 text-gray-600" />
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
                className="text-primary hover:text-primary/90 text-xs underline transition-colors"
              >
                Github
              </a>
            </footer>
          </div>
        );
      }}
    </TabManager>
  );
};

export default Home;
