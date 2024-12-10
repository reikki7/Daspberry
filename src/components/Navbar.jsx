import React from "react";
import AvatarIcon from "../assets/avatarIcon.jpg";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  return (
    <div
      data-tauri-drag-region
      className="text-white flex items-center text-sm justify-between px-4 mr-10 absolute top-5 left-0 right-0"
    >
      <div className="ml-[80px] flex items-center px-2 py-2 pr-4 rounded-full bg-gray-950/40 gap-2">
        <img
          src={AvatarIcon}
          alt="avatar"
          className="rounded-full"
          style={{ width: "30px", height: "auto" }}
        />
        <p>Hello, KidKat</p>
      </div>
      <ul className="flex gap-6">
        <li>
          <Link to="/events">
            <div
              className={`px-6 py-2 rounded-full duration-200 ${
                location.pathname === "/events"
                  ? "bg-gradient-to-r from-blue-700/30 via-purple-500/20 to-pink-900/30 text-white"
                  : "bg-gray-950/40 hover:opacity-70"
              }`}
            >
              Events
            </div>
          </Link>
        </li>
        <li>
          <Link to="/tasks">
            <div
              className={`px-6 py-2 rounded-full duration-200 ${
                location.pathname === "/tasks"
                  ? "bg-gradient-to-r from-blue-700/30 via-purple-500/20 to-pink-900/30 text-white"
                  : "bg-gray-950/40 hover:opacity-70"
              }`}
            >
              Tasks
            </div>
          </Link>
        </li>
        <li>
          <Link to="/projects">
            <div
              className={`px-6 py-2 rounded-full duration-200 ${
                location.pathname === "/projects"
                  ? "bg-gradient-to-r from-blue-700/30 via-purple-500/20 to-pink-900/30 text-white"
                  : "bg-gray-950/40 hover:opacity-70"
              }`}
            >
              Projects
            </div>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Navbar;
