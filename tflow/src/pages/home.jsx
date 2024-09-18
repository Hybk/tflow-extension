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
      <div className="flex flex-col items-center justify-center space-y-7 w-full py-7">
        <h2 className="text-lg font-bold w-1/3">Tab Overview</h2>
        {/* <div className="flex flex-col w-[250px]">
            <div className="flex items-center">
              <WrenchIcon className="w-4 h-4" />
              <h1 className="font-bold text-[13px] ml-2">DO YOU KNOW?</h1>
            </div>
            <p className="text-[10px] mt-1">
              Managing your tabs reduces memory usage, boosts system
              performance, and makes browsing faster and smoother!
            </p>
          </div> */}
        <div className="h-px w-4/5 bg-gray-300"></div>
      </div>
      <div className="flex justify-center items-center m-[auto] px-4">
        <PieChart width={300} height={300}>
          <Pie
            data={outerData}
            dataKey="value"
            cx={150}
            cy={150}
            innerRadius={60}
            outerRadius={90}
            fill="#FFA500"
            stroke="none"
          />
          <Pie
            data={innerData}
            dataKey="value"
            cx={150}
            cy={150}
            innerRadius={0}
            outerRadius={50}
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
        <div className=" flex flex-col justify-center  ">
          <div className="flex items-center space-x-3">
            <div className="w-[10px] h-[10px] rounded-full bg-[#FFA500]"></div>
            <p>Total Tabs</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-[10px] h-[10px] rounded-full bg-[#82ca9d]"></div>
            <p>Inactive Tabs</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-[10px] h-[10px] rounded-full bg-[#8884d8]"></div>
            <p>Active Tabs</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
