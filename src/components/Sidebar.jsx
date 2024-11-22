import React from "react";
import { HouseSimple, FilmStrip, Image, GameController } from "phosphor-react";
import { Link } from "react-router-dom";

const WindowControls = () => {
  return (
    <div data-tauri-drag-region className="flex gap-2 p-4">
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
  return (
    <div
      data-tauri-drag-region
      className="h-full text-white flex flex-col select-none "
    >
      <WindowControls />
      <div className="flex flex-col items-center mt-5">
        <ul className="flex flex-col items-center">
          <li>
            <Link to="/">
              <div className="p-6 hover:opacity-100 opacity-70 duration-200">
                <HouseSimple size={17} color="white" />
              </div>
            </Link>
          </li>
          <li>
            <Link to="/video-works">
              <div className="p-6 hover:opacity-100 opacity-70 duration-200">
                <FilmStrip size={17} color="white" />
              </div>
            </Link>
          </li>
          <li>
            <Link to="/photo-works">
              <div className="p-6 hover:opacity-100 opacity-70  duration-200">
                <Image size={17} color="white" />
              </div>
            </Link>
          </li>
          <li>
            <Link to="/game-progress">
              <div className="p-6 hover:opacity-100 opacity-70 duration-200">
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
