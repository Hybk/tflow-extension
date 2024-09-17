import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Onboarding from "./pages/onboarding";
import Home from "./pages/home";
import Setting from "./pages/setting";

function App() {
  return (
    <div className="w-[450px] h-[660px] m-[auto] shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-shadow duration-300 rounded-lg">
      <Router>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/home" element={<Home />} />
          <Route path="/setting" element={<Setting />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
