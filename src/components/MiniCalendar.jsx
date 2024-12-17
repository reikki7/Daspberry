import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";
import eventBus from "../utils/eventBus";

const MiniCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (event, item) => {
    const rect = event.target.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + window.scrollX + 10,
      y: rect.top + window.scrollY - 50,
    });
    setHoveredEvent(item);
  };

  const handleMouseLeave = () => {
    setHoveredEvent(null);
  };

  const loadCachedData = async () => {
    const cachedEvents =
      JSON.parse(localStorage.getItem("cached_events")) || [];
    const loadedTasks = await invoke("load_local_tasks");
    let loadedAsanaTasks = await invoke("read_asana_tasks_cache");
    const loadedLocalEvents = await invoke("load_local_events");

    // Parse Asana tasks if needed
    try {
      loadedAsanaTasks = JSON.parse(loadedAsanaTasks);
    } catch (error) {
      console.error("Failed to parse Asana tasks:", error);
      loadedAsanaTasks = [];
    }

    const asanaTasksFormatted = Array.isArray(loadedAsanaTasks)
      ? loadedAsanaTasks.map((task) => ({
          summary: task.name,
          start: task.due_on,
          type: "asana_task",
        }))
      : [];

    const tasksFormatted =
      loadedTasks?.map((task) => ({
        summary: task.title,
        start: task.date,
        type: "task",
      })) || [];

    const eventsFormatted =
      loadedLocalEvents?.map((event) => ({
        summary: event.title,
        start: event.date_start,
        end: event.date_end,
        type: "local_event",
      })) || [];

    setEvents([
      ...cachedEvents,
      ...tasksFormatted,
      ...asanaTasksFormatted,
      ...eventsFormatted,
    ]);
  };

  useEffect(() => {
    loadCachedData(); // Load data initially

    const handleUpdate = () => {
      console.log("EventBus received 'events_updated', reloading data...");
      loadCachedData();
    };

    // Listen for updates
    eventBus.on("events_updated", handleUpdate);

    // Cleanup on unmount
    return () => eventBus.off("events_updated", handleUpdate);
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

  // Group events by date
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

  // Utility function to zero out time
  const zeroTime = (date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  // Check if a day is in a range
  const isDateInRange = (day, start, end) => {
    const date = zeroTime(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    );
    const startDate = zeroTime(new Date(start));
    const endDate = end ? zeroTime(new Date(end)) : startDate;

    return date >= startDate && date <= endDate;
  };

  // Get events for a specific day
  const getEventsForDay = (day) => {
    if (!day) return [];
    return events.filter((event) => isDateInRange(day, event.start, event.end));
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
                {day &&
                  (() => {
                    const dayEvents = getEventsForDay(day); // Compute once

                    return (
                      dayEvents.length > 0 && (
                        <div className="absolute inset-0 flex justify-center items-center">
                          {dayEvents.map((item, itemIndex) => {
                            const itemColor =
                              item.summary === "Weekly Huddle"
                                ? "bg-[#ff02e5] hover:bg-opacity-80 duration-300" // Weekly Huddle
                                : item.type === "task"
                                ? "bg-[#4179f0] hover:bg-opacity-80 duration-300" // Regular tasks
                                : item.type === "asana_task"
                                ? "bg-[#fb4261] hover:bg-opacity-80 duration-300" // Asana tasks
                                : item.type === "local_event" && item.end
                                ? "bg-[#871fff] hover:bg-opacity-80 duration-300" // Multi-day events
                                : item.type === "local_event"
                                ? "bg-[#b9a8ee] hover:bg-opacity-80 duration-300" // Single-day events
                                : "bg-[#faff08] hover:bg-opacity-80 duration-300"; // Other events

                            return (
                              <span
                                key={itemIndex}
                                onMouseEnter={(event) =>
                                  handleMouseEnter(event, item)
                                }
                                onMouseLeave={handleMouseLeave}
                                className={`rounded-lg ${itemColor} ${
                                  !isToday(day) ? "w-full h-full" : ""
                                }`}
                              ></span>
                            );
                          })}
                        </div>
                      )
                    );
                  })()}
              </div>
            );
          })}
          {hoveredEvent && (
            <div
              style={{
                position: "fixed",
                top: tooltipPosition.y,
                left: tooltipPosition.x,
                background: "rgba(4, 9, 21, 0.8)",
                color: "#e0f7ff",
                padding: "8px",
                borderRadius: "8px",
                zIndex: 1000,
                maxWidth: "150px",
                pointerEvents: "none",
                whiteSpace: "normal",
                wordWrap: "break-word",
                boxShadow: "0 0 10px rgba(190, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(0, 255, 255, 0.2)",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  color: "#f0faff",
                  letterSpacing: "0.5px",
                }}
              >
                {hoveredEvent.summary}
              </div>
              <div
                style={{
                  marginTop: "4px",
                  color: "#89c2ff",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {new Date(hoveredEvent.start).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-white/10 my-3 mt-4" />
      {/* List of events and tasks this month */}
      <div className="flex flex-col gap-2 mt-2 overflow-y-scroll pr-1 text-white max-h-[125px] rounded-b-xl custom-scrollbar">
        {/* Today's Events and Tasks */}
        {currentDate.getMonth() === today.getMonth() &&
          currentDate.getFullYear() === today.getFullYear() && (
            <>
              {todayEvents.length > 0 ? (
                todayEvents.map((item, index) => (
                  <div key={index} className="flex text-[12px] mb-1.5">
                    <span
                      className={`w-1.5 h-1.5 text-xl -mt-1 ${
                        item.type === "task"
                          ? "text-[#00d1ff]"
                          : "text-cyan-400"
                      } mr-3`}
                    >
                      •
                    </span>
                    <span>
                      {item.summary}{" "}
                      <span className="text-[10px] text-gray-200/50 whitespace-nowrap">
                        — Today
                      </span>
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex text-[12px] mb-1.5">
                  <span className="w-1.5 text-xl -mt-1 h-1.5 text-cyan-400 mr-3">
                    •
                  </span>
                  Today
                </div>
              )}
            </>
          )}

        {/* Events and Tasks for the Displayed Month */}
        {events
          .filter((item) => {
            const eventDate = new Date(item.start);
            const todayString = today
              .toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
              .split(",")[0];
            const eventDateString = eventDate
              .toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
              .split(",")[0];

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

            return (
              eventDateString !== todayString &&
              eventDate.getFullYear() === currentDate.getFullYear() &&
              eventDate.getMonth() === currentDate.getMonth()
            );
          })
          .sort((a, b) => new Date(a.start) - new Date(b.start))
          .map((item, index) => (
            <div key={index} className="flex gap-3">
              <span
                className={`${
                  item.type === "task"
                    ? "text-[#4179f0] text-xl -mt-1" // Regular tasks
                    : item.type === "asana_task"
                    ? "text-[#fb4261] text-xl -mt-1" // Asana tasks
                    : item.summary === "Weekly Huddle"
                    ? "text-[#ff02e5] text-2xl -mt-[7px]" // Weekly Huddle
                    : item.type === "local_event" && item.end
                    ? "text-[#871fff] text-xl -mt-1" // Multi-day events
                    : item.type === "local_event"
                    ? "text-[#b9a8ee] text-xl -mt-1" // Single-day events
                    : "text-[#faff08] text-xl -mt-1" // Other events
                }`}
              >
                •
              </span>
              <span className="text-white/80 text-xs">
                {item.summary}{" "}
                <span className="text-[10px] text-gray-200/50 whitespace-nowrap">
                  &nbsp;—{" "}
                  {new Date(item.start).toLocaleDateString("en-US", {
                    timeZone: "Asia/Jakarta",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default MiniCalendar;
