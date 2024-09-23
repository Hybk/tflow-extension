import Onboarding from "./pages/Onboarding.tsx";
import Home from "./pages/Home.tsx";
import Settings from "./pages/Settings.tsx";
import { useState } from "react";
import { Page } from "./enums.ts";

function App() {
  const [page] = useState<Page>(Page.ONBOARDING);

  const renderView = () => {
    switch (page) {
      case Page.ONBOARDING:
        return <Onboarding />;
      case Page.HOME:
        return <Home />;
      case Page.SETTINGS:
        return <Settings />;
    }
  };

  return (
    <div className="w-[450px] h-[auto] m-[auto] shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-shadow duration-300 rounded-lg">
      {renderView()}
    </div>
  );
}

export default App;

