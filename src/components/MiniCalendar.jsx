import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MiniCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get calendar data
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];
    // Add empty slots for days before the first of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Add all days of the month
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
      <div className="flex flex-col border-b border-white/10">
        <h2
          className="text-xl font-medium text-white"
          style={{ width: "80px" }}
        >
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>

        {/* Switch months */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-3 h-3 text-white/70" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="w-3 h-3 text-white/70" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-4">
          {weekDays.map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="text-white/40 text-xs font-medium text-center"
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
          aspect-square flex items-center p-2 justify-center rounded-md text-xs
          ${
            day === null
              ? ""
              : "hover:bg-white/10 cursor-pointer transition-colors"
          }
          ${isToday(day) ? "bg-white/20 text-white" : "text-white/70"}
        `}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-white/20 my-4"></div>

      {/* No upcoming event message */}
      <div className=" text-white/70 text-sm">
        <li>No upcoming event</li>
      </div>
    </div>
  );
};

export default MiniCalendar;
