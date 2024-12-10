import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MiniCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);

  // Load cached events
  useEffect(() => {
    const loadCachedEvents = async () => {
      const cachedEvents =
        JSON.parse(localStorage.getItem("cached_events")) || [];
      setEvents(cachedEvents);
    };
    loadCachedEvents();
  }, []);

  // Get days in the current month
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

  const days = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  const today = new Date();

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  // Map events by date for faster access
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      const eventDate = new Date(event.start)
        .toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
        .split(",")[0];
      if (!map[eventDate]) map[eventDate] = [];
      map[eventDate].push(event);
    });
    return map;
  }, [events]);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const eventDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    )
      .toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      .split(",")[0];
    return eventsByDate[eventDate] || [];
  };

  const todayEvents = useMemo(() => {
    const todayString = today
      .toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      .split(",")[0];
    return eventsByDate[todayString] || [];
  }, [eventsByDate]);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-transparent">
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
      <div className="h-52">
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
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            return (
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
              >
                {day && (
                  <>
                    {dayEvents.length > 0 && (
                      <div className="absolute inset-0 flex justify-center items-center">
                        {dayEvents.map((event, eventIndex) => (
                          <span
                            key={eventIndex}
                            className={` rounded-lg ${
                              event.summary === "Weekly Huddle"
                                ? `bg-[#ff02e5] ${
                                    !isToday(day) ? "w-full h-full" : ""
                                  }`
                                : `bg-[#faff08] ${
                                    !isToday(day) ? "w-full h-full" : ""
                                  }`
                            }`}
                          ></span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-white/10 my-3 mt-4" />
      {/* List of events this month */}
      <div className="flex flex-col gap-2 mt-2 overflow-y-scroll text-white max-h-[125px] rounded-b-xl custom-scrollbar">
        {currentDate.getMonth() === today.getMonth() &&
          currentDate.getFullYear() === today.getFullYear() &&
          (todayEvents.length > 0 ? (
            <div className="flex text-[12px]">
              <span className="w-1.5 h-1.5 text-xl -mt-1 text-cyan-400 mr-3">
                •
              </span>
              Today - {todayEvents[0].summary}
            </div>
          ) : (
            <div className="flex text-[12px]">
              <span className="w-1.5 text-xl -mt-1 h-1.5 text-cyan-400 mr-3">
                •
              </span>
              Today
            </div>
          ))}
        {events
          .filter((event) => {
            const eventDate = new Date(event.start);
            const today = new Date();
            const todayString = today
              .toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
              .split(",")[0];
            const eventDateString = eventDate
              .toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
              .split(",")[0];

            // If displayed month is current month, show only future events in this month
            if (
              currentDate.getFullYear() === today.getFullYear() &&
              currentDate.getMonth() === today.getMonth()
            ) {
              return (
                eventDateString !== todayString &&
                eventDate >= today &&
                eventDate.getFullYear() === currentDate.getFullYear() &&
                eventDate.getMonth() === currentDate.getMonth()
              );
            }

            // For other months, only show events in the displayed month
            return (
              eventDateString !== todayString &&
              eventDate.getFullYear() === currentDate.getFullYear() &&
              eventDate.getMonth() === currentDate.getMonth()
            );
          })
          .sort((a, b) => new Date(a.start) - new Date(b.start))
          .map((event, index) => (
            <div key={index} className="flex gap-3">
              <span
                className={` ${
                  event.summary === "Weekly Huddle"
                    ? "text-[#ff02e5] text-2xl -mt-[7px]"
                    : "text-[#faff08] text-xl -mt-1 "
                }`}
              >
                •
              </span>
              <span className="text-white/80 text-xs">
                {event.summary}{" "}
                <span className="text-[10px] text-gray-200/50">
                  -{" "}
                  {new Date(event.start).toLocaleDateString("en-US", {
                    timeZone: "Asia/Jakarta",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </span>
              <span className="text-white/60 text-xs"></span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default MiniCalendar;
