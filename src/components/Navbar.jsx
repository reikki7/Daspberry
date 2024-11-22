import React from "react";
import AvatarIcon from "../assets/avatarIcon.jpg";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <div
      data-tauri-drag-region
      className="text-white flex items-center text-sm justify-between px-4 mr-10 absolute top-5 left-0 right-0"
    >
      <div className="ml-[80px] flex items-center px-2 py-2 pr-4  rounded-full bg-gray-950/40 gap-2">
        <img
          src={AvatarIcon}
          alt="avatar"
          className="rounded-full "
          style={{ width: "30px", height: "auto" }}
        />
        <p>Hello, KidKat</p>
      </div>
      <ul className="flex gap-6">
        <li>
          <Link to="/calendar">
            <div className="bg-gray-950/40 px-6 py-2 rounded-full hover:opacity-70 duration-200">
              Calendar
            </div>
          </Link>
        </li>
        <li>
          <Link to="/tasks">
            <div className="bg-gray-950/40 px-6 py-2 rounded-full hover:opacity-70 duration-200">
              Tasks
            </div>
          </Link>
        </li>
        <li>
          <Link to="/monetary">
            <div className="bg-gray-950/40 px-6 py-2 rounded-full hover:opacity-70 duration-200">
              Monetary
            </div>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Navbar;
