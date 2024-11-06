import Logo from "/icon-48px.png";
import {
  ChevronDownIcon,
  WrenchIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useState } from "react";
import "../App.css";
import Home from "./Home.tsx";
import { Page } from "../enums.ts";

function Onboarding() {
  const [isClicked, setIsClicked] = useState(false);
  const [page, setPage] = useState(Page.ONBOARDING);

  const handleStart = () => {
    setIsClicked(true);

    setTimeout(() => {
      setPage(Page.HOME);
    }, 500);
  };

  if (page === Page.HOME) {
    return <Home />;
  }

  return (
    <div className="w-full bg-secondary">
      <div
        id="header"
        className="flex justify-between bg-white h-16 px-6 items-center"
      >
        <div className="flex items-center space-x-3">
          <img src={Logo} alt="TabFlow Logo" className="w-6 h-6" />
          <h1 className="text-xl font-bold">TabFlow</h1>
        </div>
        <XMarkIcon
          className="w-6 h-6 cursor-pointer"
          onClick={() => window.close()}
        />
      </div>
      <div id="body" className="p-8 flex flex-col space-y-7">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold">
            Welcome to TabFlow <span>👋</span>
          </h1>
          <p className="text-sm">
            Boost productivity with TabFlow: effortlessly track, organize, and
            clean up tabs for a seamless browsing experience.
          </p>
        </div>
        <div className="border border-primary flex flex-col space-y-3 p-6 items-center rounded-lg">
          <p className="font-bold self-start">How it works</p>
          <ul className="list-disc space-y-3 w-9/12">
            <li className="text-sm">
              TabFlow starts working automatically once installed.
            </li>
            <li className="text-sm">
              Adjust tab management preferences and notifications in the
              Settings.
            </li>
            <li className="text-sm">
              And Tada! Let TabFlow organize your tabs for a cleaner, more
              efficient browsing experience.
            </li>
          </ul>
        </div>
        <div className="flex flex-col items-center justify-center space-y-3">
          <p className="text-sm">Click the button below to get running</p>
          <div className="flex flex-col items-center justify-center h-6 w-6 relative -top-2">
            <ChevronDownIcon className="text-blue-500 animate-bounce-custom" />
            <ChevronDownIcon className="text-blue-500 animate-bounce-custom" />
          </div>
          <button
            onClick={handleStart}
            className={`bg-primary text-white font-bold p-5 rounded-full w-52 transform transition-transform duration-500 ${
              isClicked ? "scale-110" : ""
            }`}
          >
            Get Started
          </button>
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
}

export default Onboarding;
