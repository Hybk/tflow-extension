import { useState, useEffect } from "react";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import { Page } from "./enums";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    // Check if onboarding has been completed
    chrome.storage.local.get(["onboardingComplete"], (result) => {
      if (result.onboardingComplete) {
        setShowOnboarding(false);
      }
    });
  }, []);

  const completeOnboarding = () => {
    // Set onboarding as complete in storage
    chrome.storage.local.set({ onboardingComplete: true }, () => {
      setShowOnboarding(false);
    });
  };

  if (showOnboarding) {
    return (
      <div className="w-[450px] h-[auto] m-[auto] shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-shadow duration-300 rounded-lg">
        <Onboarding onComplete={completeOnboarding} />
      </div>
    );
  }

  const renderView = () => {
    switch (currentPage) {
      case Page.HOME:
        return <Home onBack={() => setCurrentPage(Page.SETTINGS)} />;
      case Page.SETTINGS:
        return <Settings onBack={() => setCurrentPage(Page.HOME)} />;
      default:
        return <Home onBack={() => setCurrentPage(Page.SETTINGS)} />;
    }
  };

  return (
    <div className="w-[450px] h-[auto] m-[auto] shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-shadow duration-300 rounded-lg">
      {renderView()}
    </div>
  );
}

export default App;
