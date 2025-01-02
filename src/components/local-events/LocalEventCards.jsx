import { MapPin } from "lucide-react";

const LocalEventCards = ({
  paginatedEvents,
  setSelectedEvent,
  imageCache,
  containerHeight,
  getTitleSize,
  getTimeRemainingLabel,
}) => {
  const calculateTimeRemainingLabel = (event) => {
    const now = new Date();
    const startDateTime = new Date(
      `${event.date_start}T${event.time_start || "00:00"}`
    );

    // Adjust time difference by setting the time to midnight for accurate day calculation
    const startDateMidnight = new Date(
      startDateTime.getFullYear(),
      startDateTime.getMonth(),
      startDateTime.getDate()
    );
    const nowMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const difference = startDateMidnight - nowMidnight;

    if (difference <= 0) return "";

    const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;

    if (months > 0) {
      return `in ${months} month${months > 1 ? "s" : ""}`;
    } else if (weeks > 0) {
      return `in ${weeks}w ${remainingDays}d`;
    } else {
      return `in ${days} day${days > 1 ? "s" : ""}`;
    }
  };

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
        rounded-2xl 
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
              <div className="absolute top-2 right-2 bg-gray-950/30 text-cyan-50 px-3 rounded-full py-1 text-xs">
                {calculateTimeRemainingLabel(event)}
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
                  <div className="text-xs text-gray-200 flex items-center gap-1.5">
                    <MapPin size={12} />
                    <span title={event.location}>
                      {event.location.length > 27
                        ? `${event.location.slice(0, 27)}...`
                        : event.location}
                    </span>
                  </div>
                )}
              </div>

              {/* Date Section */}
              {event.date_start && (
                <div
                  className="flex flex-col text-center 
                  bg-gray-950/20 border border-white/30 
                  rounded-xl overflow-hidden w-12 min-w-[3rem] 
                  items-center text-white shadow-lg"
                >
                  <div className="bg-gray-950/30 w-full border-b-2 border-white/10 py-1 text-xs uppercase tracking-wider">
                    {new Date(event.date_start).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </div>
                  <div
                    className="text-xl w-full font-orbitron font-bold py-2 
                  bg-gray-950/20"
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
