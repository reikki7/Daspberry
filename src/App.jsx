import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./utils/AuthContext";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

// Screens
import Home from "./screens/Home";
import Events from "./screens/Events";
import GameProgress from "./screens/GameProgress";
import PhotoWorks from "./screens/PhotoWorks";
import VideoWorks from "./screens/VideoWorks";
import Tasks from "./screens/Tasks";
import Projects from "./screens/Projects";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const EmptyHome = () => null;

const AppContent = () => {
  const location = useLocation();

  return (
    <div
      data-tauri-drag-region
      className="relative bg-gray-950/40 font-roboto h-screen flex rounded-3xl overflow-hidden"
    >
      <div
        data-tauri-drag-region
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage: 'url("/main-background.jpg")',
          backgroundSize: "170% auto",
          backgroundPositionY: "42%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "blur(15px)",
          opacity: "0.6",
        }}
      />
      <Sidebar />
      <div className="flex flex-col">
        <Navbar />
        <div
          data-tauri-drag-region
          className="flex max-w-[1323px] pb-6 max-h-[1032px] min-w-[1320px] min-h-[1038px]"
        >
          <div
            className="flex-1 pr-12 pb-16 text-white pt-20"
            data-tauri-drag-region
          >
            {/* Always mounted Home component */}
            <div
              style={{ display: location.pathname === "/" ? "block" : "none" }}
            >
              <Home />
            </div>

            <Routes>
              <Route path="/" element={<EmptyHome />} />
              <Route path="/events" element={<Events />} />
              <Route path="/game-progress" element={<GameProgress />} />
              <Route path="/photo-works" element={<PhotoWorks />} />
              <Route path="/video-works" element={<VideoWorks />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/projects" element={<Projects />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  useEffect(() => {
    const disableContextMenu = (e) => {
      e.preventDefault();
    };

    // Add the event listener
    window.addEventListener("contextmenu", disableContextMenu);

    // Cleanup the event listener on unmount
    return () => {
      window.removeEventListener("contextmenu", disableContextMenu);
    };
  }, []);

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppContent />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};
export default App;
