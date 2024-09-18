import Logo from "/icon-48px.png";
import { XMarkIcon, WrenchIcon } from "@heroicons/react/24/solid";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { useState } from "react";

const outerData = [{ name: "Total", value: 100 }];
const innerData = [
  { name: "Active Tabs", value: 60 },
  { name: "Inactive Tabs", value: 40 },
];

const Home = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const handleClose = () => {
    window.close();
  };

  const getCellStyle = (index) => ({
    transform: index === hoveredIndex ? "scale(1.1)" : "scale(1)",
    transition: "transform 0.3s ease-in-out",
    transformOrigin: "center",
  });

  return (
    <div className="w-full bg-secondary">
      <div className="flex justify-between bg-white h-16 px-6 items-center">
        <div className="flex items-center space-x-3">
          <img src={Logo} alt="TabFlow Logo" className="w-6 h-6" />
          <h1 className="text-xl font-bold">TabFlow</h1>
        </div>
        <XMarkIcon className="w-6 h-6 cursor-pointer" onClick={handleClose} />
      </div>
      <div className="flex flex-col items-center w-full mt-8">
        <div className="flex items-center justify-between p-5 w-full">
          <h2 className="text-lg font-bold w-1/3">Tab Overview</h2>
          <div className="flex flex-col w-1/2">
            <div className="flex items-center">
              <WrenchIcon className="w-4 h-4" />
              <h1 className="font-bold text-sm ml-2">Pro Tip</h1>
            </div>
            <p className="text-xs mt-1">
              Pin the extension for easy access to control
            </p>
          </div>
        </div>
        <div className="h-px w-4/5 bg-gray-300"></div>
      </div>

      <div className="flex justify-center">
        <PieChart width={500} height={500}>
          <Pie
            data={outerData}
            dataKey="value"
            cx={250}
            cy={250}
            innerRadius={100}
            outerRadius={150}
            fill="#FFA500"
            stroke="none"
          />
          <Pie
            data={innerData}
            dataKey="value"
            cx={250}
            cy={250}
            innerRadius={0}
            outerRadius={90}
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
    </div>
  );
};

export default Home;
