import React from "react";
import AvatarIcon from "../assets/avatarIcon.jpg";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  return (
    <div
      data-tauri-drag-region
      className="text-white flex items-center text-sm justify-between px-4 mr-10 absolute top-5 left-0 right-0"
      style={{ userSelect: "none" }}
    >
      {/* Avatar Section */}
      <div className="ml-[80px] flex items-center px-2 py-2 pr-4 rounded-full bg-gray-950/40 gap-2 backdrop-blur-md border border-white/10 shadow-md">
        <img
          src={AvatarIcon}
          alt="avatar"
          className="rounded-full"
          style={{
            width: "35px",
            height: "auto",
            boxShadow: "0 0 9px #e031cb",
          }}
        />
        <p className="font-extralight tracking-wider animate-pulse">
          Hello, KidKat
        </p>
      </div>

      {/* Navigation Links */}
      <ul className="flex gap-6">
        {[
          { name: "Events", path: "/events" },
          { name: "Tasks", path: "/tasks" },
          { name: "Projects", path: "/projects" },
        ].map((item) => (
          <li key={item.path}>
            <Link to={item.path}>
              <div
                className={`px-6 py-2 rounded-full text-white text-sm tracking-wide font-light transition-all duration-300 shadow-lg
                ${
                  location.pathname === item.path
                    ? "bg-gradient-to-r from-[#ff69af] via-[#832ed3] to-[#2188e9] text-white shadow-lg shadow-pink-500/30 border border-white/20"
                    : "bg-gray-950/40 hover:opacity-90 hover:shadow-lg hover:shadow-blue-400/30 border border-white/10"
                }`}
                style={{
                  userSelect: "none",
                  backgroundSize: "105%",
                  backgroundPosition: "50%",
                }}
              >
                {item.name}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Navbar;
