import React from "react";
import { MapPin, Clock7 } from "lucide-react";

const LocalMapEventCards = ({
  paginatedEvents,
  setSelectedEvent,
  imageCache,
  containerHeight,
}) => {
  return (
    <div className="w-full h-[331px] mx-auto space-y-6 overflow-y-scroll ">
      {paginatedEvents.events.map((event) => {
        const eventDate = new Date(event.date_start);

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
                {event.time_start && (
                  <div className="text-sm text-left text-gray-300 flex items-center gap-3 mt-1.5">
                    <Clock7 size={14} className="-mt-0.5" />

                    <div className="text-sm text-left">
                      {new Date(
                        `2000-01-01T${event.time_start}`
                      ).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {event.time_end && (
                        <>
                          {" - "}
                          {new Date(
                            `2000-01-01T${event.time_end}`
                          ).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default LocalMapEventCards;