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
      <div className="ml-[80px] flex items-center px-2 py-1 pr-6 rounded-full bg-gray-950/40 gap-2 backdrop-blur-md border border-white/10 shadow-md">
        <img
          src={AvatarIcon}
          alt="avatar"
          className="rounded-full -ml-1 mr-3"
          style={{
            width: "31px",
            height: "auto",
            boxShadow: "0 0 9px #7087fe",
          }}
        />
        <p className="font-extralight text-[13px] tracking-wider text-white hover:text-gray-300 duration-300">
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
                    ? "bg-gradient-to-r from-[#ff69af]/75 via-[#832ed3]/75 to-[#2188e9]/75  text-white shadow-lg shadow-pink-500/30"
                    : "bg-gray-950/40 hover:opacity-90 hover:shadow-lg hover:shadow-blue-400/30"
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
