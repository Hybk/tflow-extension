import Onboarding from "./pages/onboarding";
import Home from "./pages/home";
import Setting from "./pages/setting";
import { useState } from "react";

function App() {
  const [view] = useState("onboarding");

  const renderView = () => {
    switch (view) {
      case "onboarding":
        return <Onboarding />;
      case "home":
        return <Home />;
      case "setting":
        return <Setting />;
      default:
        return <Onboarding />;
    }
  };

  return (
    <div className="w-[450px] h-[auto] m-[auto] shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-shadow duration-300 rounded-lg">
      {renderView()}
    </div>
  );
}

export default App;
