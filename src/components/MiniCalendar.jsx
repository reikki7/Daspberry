import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MiniCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-transparent">
            {monthNames[currentDate.getMonth()]}
          </h2>
          <span className="text-white/60 text-sm">
            {currentDate.getFullYear()}
          </span>
        </div>

        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-100" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300"
          >
            <ChevronRight className="w-4 h-4 text-cyan-100" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="text-white/40 text-xs font-medium text-center p-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div
              key={index}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm
                transition-all duration-300 relative
                ${
                  day === null
                    ? ""
                    : isToday(day)
                    ? "bg-[#05f7ff] hover:bg-opacity-80 text-cyan-400 font-bold"
                    : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-cyan-400"
                }
                ${day === null ? "" : "cursor-pointer"}
              `}
            ></div>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-white/10 my-6"></div>

      {/* No upcoming event message */}
      <div className="text-white/60 text-sm flex items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-2"></span>
        No upcoming event
      </div>
    </div>
  );
};

export default MiniCalendar;
