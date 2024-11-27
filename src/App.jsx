import React from "react";
import MusicPlayer from "./components/MusicPlayer";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

// Screens
import Home from "./screens/Home";
import Calendar from "./screens/Calendar";
import GameProgress from "./screens/GameProgress";
import PhotoWorks from "./screens/PhotoWorks";
import VideoWorks from "./screens/VideoWorks";
import Tasks from "./screens/Tasks";
import Monetary from "./screens/Monetary";

const App = () => {
  return (
    // <Router>
    //   <div
    //     data-tauri-drag-region
    //     className="relative bg-gray-950/40 font-roboto h-screen flex rounded-3xl overflow-hidden"
    //   >
    //     <div
    //       data-tauri-drag-region
    //       className="absolute inset-0 -z-10 opacity-30"
    //       style={{
    //         backgroundImage: 'url("/main-background.jpg")',
    //         backgroundSize: "170% auto",
    //         backgroundPositionY: "42%",
    //         backgroundPosition: "center",
    //         backgroundRepeat: "no-repeat",
    //         filter: "blur(15px)",
    //         opacity: "0.6",
    //       }}
    //     />
    //     <Sidebar />
    //     <div className="flex flex-col">
    //       <Navbar />
    //       <div
    //         data-tauri-drag-region
    //         className="flex max-w-[1320px] pb-6 max-h-[1035px] min-w-[1320px] min-h-[1035px] "
    //       >
    //         <div
    //           className="flex-1 pr-12 pb-16 text-white pt-20"
    //           data-tauri-drag-region
    //         >
    //           <Routes>
    //             <Route path="/" element={<Home />} />
    //             <Route path="/calendar" element={<Calendar />} />
    //             <Route path="/game-progress" element={<GameProgress />} />
    //             <Route path="/photo-works" element={<PhotoWorks />} />
    //             <Route path="/video-works" element={<VideoWorks />} />
    //             <Route path="/tasks" element={<Tasks />} />
    //             <Route path="/monetary" element={<Monetary />} />
    //           </Routes>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </Router>
    <div className="bg-white " data-tauri-drag-region>
      <MusicPlayer />
    </div>
  );
};

export default App;
