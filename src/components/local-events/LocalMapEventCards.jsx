import React from "react";
import { MapPin, Clock7 } from "lucide-react";

const LocalMapEventCards = ({
  paginatedEvents,
  setSelectedEvent,
  imageCache,
}) => {
  const calculateTimeRemainingLabel = (event) => {
    // If no date_start, don't calculate remaining hours
    if (!event.date_start) {
      const days = event.duration_in_days;
      return `${days} day${days > 1 ? "s" : ""}`;
    }

    const now = new Date();
    const startDateTime = new Date(
      `${event.date_start}T${event.time_start || "00:00"}`
    );

    // Calculate the difference in milliseconds
    const difference = startDateTime - now;

    // Calculate the time components
    const minutes = Math.floor(difference / (1000 * 60));
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    const remainingHours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (months > 0) {
      const daysLabel = remainingDays > 0 ? ` ${remainingDays}d` : "";
      return remainingDays > 0
        ? `in ${months}m ${remainingDays}d`
        : `in ${months} month${months > 1 ? "s" : ""}`;
    } else if (weeks > 0) {
      const daysLabel = remainingDays > 0 ? ` ${remainingDays}d` : "";
      return remainingDays > 0
        ? `in ${weeks}w ${remainingDays}d`
        : `in ${weeks} week${weeks > 1 ? "s" : ""}`;
    } else if (days > 0) {
      const hoursLabel = remainingHours > 0 ? ` ${remainingHours}h` : "";
      return remainingHours > 0
        ? `in ${days}d ${remainingHours}h`
        : `in ${days} day${days > 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
  };

  return (
    <div className="w-full h-[331px] mx-auto space-y-6 overflow-y-scroll ">
      {paginatedEvents.events.map((event) => {
        const eventDate = new Date(event.date_start);
        const now = new Date();

        const isOngoing = (event) => {
          const startDateTime = new Date(
            `${event.date_start}T${event.time_start || "00:00"}`
          );
          const endDateTime = new Date(
            `${event.date_end || event.date_start}T${event.time_end || "23:59"}`
          );

          return startDateTime <= now && endDateTime >= now;
        };

        return (
          <button
            key={event.id}
            className="relative w-full group overflow-x-hidden 
              rounded-lg bg-gray-950/40 
              shadow-lg"
            onClick={() => setSelectedEvent(event)}
          >
            {/* Background Overlay */}
            <div
              className="absolute inset-0 z-0 opacity-30 group-hover:opacity-50 transition-opacity duration-300 event-card-holographic"
              style={{
                backgroundImage: `url(${imageCache[event.id] || ""})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "contrast(120%) brightness(80%)",
              }}
            />

            {/* Content Container */}
            <div className="relative z-10 p-5 flex items-center gap-6 text-white">
              {event.date_start && (
                <>
                  {/* Date Block */}
                  <div
                    className="flex flex-col text-center 
                overflow-hidden w-24 min-w-[5rem] 
                items-center"
                  >
                    <div className="w-full flex flex-col items-center text-sm uppercase tracking-wide font-semibold">
                      <div className="text-5xl font-bold py-2">
                        {eventDate.getDate().toString().padStart(2, "0")}
                      </div>
                      <span className="text-base">
                        {eventDate.toLocaleString("default", { month: "long" })}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Time Remaining Label */}
              {!isOngoing(event) && event.date_start && (
                <div className="absolute top-2 right-2 bg-gray-950/30 text-cyan-50 px-3 rounded-full py-1 text-xs">
                  {calculateTimeRemainingLabel(event)}
                </div>
              )}

              {/* Event Details */}
              <div className="flex-grow">
                <h3 className="font-bold text-left text-2xl text-white truncate">
                  {event.title}
                </h3>
                {event.location && (
                  <div className="text-sm text-gray-300 flex items-center gap-3 mt-1">
                    <MapPin size={14} className="-mt-0.5" />
                    <span>{event.location}</span>
                  </div>
                )}
                <div className="text-sm text-left text-gray-300 flex items-center gap-3 mt-1">
                  {event.time_start && (
                    <div className="text-sm text-left text-gray-300 flex items-center gap-3">
                      <Clock7 size={14} className="-mt-0.5" />

                      <div className="text-sm text-left">
                        {new Date(
                          `2000-01-01T${event.time_start}`
                        ).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                        {event.time_end && (
                          <>
                            {" - "}
                            {new Date(
                              `2000-01-01T${event.time_end}`
                            ).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </>
                        )}
                      </div>
                      {/* Ongoing Badge */}
                    </div>
                  )}
                  {isOngoing(event) && (
                    <div className="text-xs bg-gray-950/30 text-white px-2 py-1 rounded-md">
                      Ongoing until{" "}
                      <span className="font-bold">
                        {(() => {
                          const endDateTime = new Date(
                            `${event.date_end || event.date_start}T${
                              event.time_end || "23:59"
                            }`
                          );
                          const now = new Date();

                          // Check if the event ends today
                          const isToday =
                            endDateTime.toDateString() === now.toDateString();

                          return isToday
                            ? endDateTime.toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hourCycle: "h23", // 24-hour format
                              }) // Format as hh:mm
                            : endDateTime.toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "long",
                              }); // Format as dd Month
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default LocalMapEventCards;
