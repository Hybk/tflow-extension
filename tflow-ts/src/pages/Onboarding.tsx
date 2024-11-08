import { useState } from "react";
import Logo from "/icon-48px.png";
import {
  ChevronDownIcon,
  WrenchIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

// Reuse the same Card components for consistency
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

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleStart = () => {
    setIsClicked(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

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
            <CardTitle className="text-2xl">
              Welcome to TabFlow <span className="ml-2">👋</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-6">
              Boost productivity with TabFlow: effortlessly track, organize, and
              clean up tabs for a seamless browsing experience.
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">How it works</h3>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <p className="text-sm text-gray-600">
                    TabFlow starts working automatically once installed.
                  </p>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <p className="text-sm text-gray-600">
                    Adjust tab management preferences and notifications in the
                    Settings.
                  </p>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <p className="text-sm text-gray-600">
                    And Tada! Let TabFlow organize your tabs for a cleaner, more
                    efficient browsing experience.
                  </p>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center justify-center border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 mb-2">
                Click the button below to get started
              </p>
              <div className="flex flex-col items-center justify-center h-6 w-6 mb-4">
                <ChevronDownIcon className="text-primary animate-bounce" />
                <ChevronDownIcon className="text-primary animate-bounce delay-75" />
              </div>
              <button
                onClick={handleStart}
                className={`bg-primary text-white font-medium rounded-lg px-8 py-3 hover:bg-primary/90 transition-all duration-300 ${
                  isClicked ? "scale-105" : ""
                }`}
              >
                Get Started
              </button>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="fixed bottom-0 w-full flex justify-between items-center p-3 bg-white border-t border-gray-200">
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
};

export default Onboarding;
