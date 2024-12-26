import React from "react";
import { HouseSimple, FilmStrip, Image, GameController } from "phosphor-react";
import { Link, useLocation } from "react-router-dom";

const WindowControls = () => {
  return (
    <div className="flex gap-2 p-4 z-[999] absolute left-0 top-0">
      <button
        className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
        onClick={() => window.__TAURI__.window.getCurrent().close()}
      />
      <button
        className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
        onClick={() => window.__TAURI__.window.getCurrent().minimize()}
      />
      <button
        className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
        onClick={() => window.__TAURI__.window.getCurrent().toggleMaximize()}
      />
    </div>
  );
};

const Sidebar = () => {
  const location = useLocation(); // Track the current route

  return (
    <div
      data-tauri-drag-region
      className="h-full px-2 text-white flex flex-col select-none"
    >
      <WindowControls />
      <div className="flex flex-col items-center mt-16">
        <ul className="flex flex-col items-center">
          <li>
            <Link to="/">
              <div
                className={`p-6 hover:opacity-100 duration-200 ${
                  location.pathname === "/" ? "opacity-100" : "opacity-70 "
                }`}
              >
                <HouseSimple size={17} color="white" />
              </div>
            </Link>
          </li>
          <li>
            <Link to="/video-works">
              <div
                className={`p-6 hover:opacity-100 duration-200 ${
                  location.pathname === "/video-works"
                    ? "opacity-100"
                    : "opacity-70"
                }`}
              >
                <FilmStrip size={17} color="white" />
              </div>
            </Link>
          </li>
          <li>
            <Link to="/photo-works">
              <div
                className={`p-6 hover:opacity-100 duration-200 ${
                  location.pathname === "/photo-works"
                    ? "opacity-100"
                    : "opacity-70"
                }`}
              >
                <Image size={17} color="white" />
              </div>
            </Link>
          </li>
          <li>
            <Link to="/game-progress">
              <div
                className={`p-6 hover:opacity-100 opacity-70 duration-200 ${
                  location.pathname === "/game-progress"
                    ? "bg-cyan-600/30 rounded-md"
                    : ""
                }`}
              >
                <GameController size={17} color="white" />
              </div>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
