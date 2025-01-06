import React from "react";

const GoogleCalendarEventCards = ({
  sortedAndFilteredEvents,
  setSelectedEvent,
}) => {
  return (
    <div className="flex flex-col mt-1 gap-1.5 overflow-y-auto overflow-x-hidden max-h-full w-full rounded-lg shadow-lg">
      {sortedAndFilteredEvents.map((event, index) => (
        <button
          key={index}
          className="relative border border-white/25 flex items-center gap-4 py-1 rounded-lg bg-gray-950/40
            shadow-md hover:shadow-cyan-600/40 duration-300 overflow-hidden group"
          onClick={() => setSelectedEvent(event)}
        >
          {/* Holographic Overlay */}
          <div
            className="absolute inset-0 opacity-10 group-hover:opacity-40
              transition-opacity duration-200 bg-gradient-to-br from-cyan-500/20 to-purple-500/20"
          />

          {/* Event Time */}
          <div className="flex flex-col items-center font-semibold gap-2 p-2 rounded-md text-xs text-white">
            <span>
              {new Date(event.start).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>

          {/* Event Details */}
          <div className="w-40 flex flex-col text-left">
            <h3 className="text-sm font-semibold w-32 text-white truncate">
              {event.summary}
            </h3>
            <span className="text-[11px] text-gray-300">
              {new Date(event.start).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
              {" - "}
              {new Date(event.end).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default GoogleCalendarEventCards;
