import { MapPin } from "lucide-react";

const LocalEventCards = ({
  paginatedEvents,
  setSelectedEvent,
  imageCache,
  containerHeight,
  getTitleSize,
  getTimeRemainingLabel,
}) => {
  return (
    <div
      className={`grid grid-cols-1 ${containerHeight} w-[1240px] rounded-xl md:grid-cols-2 lg:grid-cols-4 gap-6`}
    >
      {paginatedEvents.events.map((event) => {
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
            className="relative w-full max-w-md mx-auto group overflow-hidden 
        rounded-2xl border border-transparent hover:border-cyan-600/50 
        bg-gray-950/40
        hover:scale-[1.02] transition-transform duration-300 
        shadow-2xl shadow-black/20"
            onClick={() => setSelectedEvent(event)}
          >
            {/* Holographic Overlay */}
            <div
              className="absolute inset-0 z-0 opacity-30 group-hover:opacity-50 transition-opacity duration-300 event-card-holographic"
              style={{
                backgroundImage: `url(${imageCache[event.id] || ""})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "contrast(120%) brightness(80%) hue-rotate(10deg)",
              }}
            />

            {/* Cyberpunk Grid Overlay */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(0deg, transparent 24%, rgba(32, 255, 200, 0.1) 25%, rgba(32, 255, 200, 0.1) 26%, transparent 27%, transparent 74%, rgba(32, 255, 200, 0.1) 75%, rgba(32, 255, 200, 0.1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(32, 255, 200, 0.1) 25%, rgba(32, 255, 200, 0.1) 26%, transparent 27%, transparent 74%, rgba(32, 255, 200, 0.1) 75%, rgba(32, 255, 200, 0.1) 76%, transparent 77%, transparent)",
                backgroundSize: "50px 50px",
              }}
            />

            {/* Time Remaining Label */}
            {!isOngoing(event) && (
              <div className="absolute top-2 right-2 bg-cyan-600/30 text-cyan-50 px-2 py-1 rounded-md text-xs">
                {getTimeRemainingLabel(event)}
              </div>
            )}

            {/* Content Container */}
            <div className="relative z-10 p-4 pl-5 text-left text-cyan-50 flex items-center">
              {/* Left Content */}
              <div className="flex-grow pr-4">
                {/* Event Title */}
                <h2
                  className={`${getTitleSize} font-orbitron font-bold 
                text-transparent bg-clip-text 
                bg-gradient-to-r from-white to-cyan-200 
                mb-2 tracking-wide`}
                >
                  {event.title}
                </h2>

                {/* Location */}
                {event.location && (
                  <div className="text-xs text-cyan-300 flex items-center gap-1.5">
                    <MapPin size={12} className="text-cyan-500" />
                    <span title={event.location}>
                      {event.location.length > 27
                        ? `${event.location.slice(0, 27)}...`
                        : event.location}
                    </span>
                  </div>
                )}

                {/* Ongoing Badge */}
                {isOngoing(event) && (
                  <div className="mt-2 text-xs bg-cyan-600/30 text-cyan-200 px-2 py-1 rounded-md inline-block">
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
                          ? endDateTime.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hourCycle: "h23", // 24-hour format
                            }) // Format as hh:mm
                          : endDateTime.toLocaleDateString("en-US", {
                              day: "2-digit",
                              month: "short",
                            }); // Format as dd Month
                      })()}
                    </span>
                  </div>
                )}
              </div>

              {/* Date Section */}
              {event.date_start && (
                <div
                  className="flex flex-col text-center 
                  bg-gray-950/20 border border-cyan-500/30 
                  rounded-xl overflow-hidden w-12 min-w-[3rem] 
                  items-center text-white shadow-lg date-card"
                >
                  <div className="bg-cyan-600/30 w-full py-1 text-xs uppercase tracking-wider">
                    {new Date(event.date_start).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </div>
                  <div
                    className="text-xl w-full font-orbitron font-bold py-2 
                  bg-gradient-to-br from-cyan-400/10 to-blue-600/10"
                  >
                    {new Date(event.date_start).toLocaleDateString("en-US", {
                      day: "numeric",
                    })}
                  </div>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default LocalEventCards;
