import { useState, useMemo } from "react";
import { CalendarCheck2, MapPin } from "lucide-react";

const LocalPastEventModal = ({
  setPastEventsModalOpen,
  setSelectedEvent,
  events = [],
}) => {
  const [isSortedMostRecent, setIsSortedMostRecent] = useState(true);

  const pastEvents = events.filter((event) => {
    const eventEndDate = event.date_end
      ? new Date(event.date_end)
      : new Date(event.date_start);
    return eventEndDate < new Date();
  });

  const sortedPastEvents = useMemo(() => {
    return isSortedMostRecent
      ? [...pastEvents].sort(
          (a, b) =>
            new Date(b.date_end || b.date_start) -
            new Date(a.date_end || a.date_start)
        )
      : [...pastEvents].sort(
          (a, b) =>
            new Date(a.date_end || a.date_start) -
            new Date(b.date_end || b.date_start)
        );
  }, [isSortedMostRecent, pastEvents]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl"></div>

      {/* Modal Container */}
      <div
        data-tauri-drag-region
        className="relative bg-black/70 rounded-3xl border border-white/10 shadow-2xl p-8 w-full max-w-xl overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={() => setPastEventsModalOpen(false)}
          className="px-3 py-1 absolute top-3 right-3 rounded-full hover:rotate-90 text-white/60 hover:text-white duration-300"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Past Events</h2>
          <p className="text-sm text-white/60">
            Review and manage past activities.
          </p>
        </div>

        {/* Sort Button */}
        <div className="flex justify-end items-center mb-5">
          <button
            onClick={() => setIsSortedMostRecent((prev) => !prev)}
            className="bg-cyan-500/20 text-cyan-200 px-3 py-2 rounded-md text-xs hover:bg-cyan-500/30 transition-all duration-300"
          >
            {isSortedMostRecent ? "Oldest First" : "Most Recent First"}
          </button>
        </div>

        {/* Past Events List */}
        <div className="space-y-4 min-h-[650px] max-h-[650px] overflow-y-auto scrollbar-hide relative">
          {sortedPastEvents.length > 0 ? (
            sortedPastEvents.map((event) => (
              <div
                key={event.id}
                className="p-5 bg-gray-800/30 rounded-lg border border-gray-700/50 
                hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-400/30 transition-all duration-300"
              >
                <h3 className="text-lg font-medium text-white mb-2 group-hover:text-blue-300 transition-colors">
                  {event.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {/* Date Section */}
                  <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                    <CalendarCheck2 size={14} className="text-blue-400" />
                    <p className="text-white/70">
                      {new Date(event.date_start).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      {event.date_end && (
                        <>
                          <span className="text-white/40">–</span>{" "}
                          {new Date(event.date_end).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Time Section */}
                  {event.time_start && (
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      <p className="text-white/70">
                        {event.time_start}
                        {event.time_end && (
                          <>
                            <span className="text-white/40 mx-1">–</span>
                            {event.time_end}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-start">
                  <span>
                    {event.location && (
                      <div className="inline-flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md mt-3">
                        <MapPin size={14} className="text-purple-400/80" />
                        <p className="text-xs text-white/70">
                          {event.location}
                        </p>
                      </div>
                    )}
                  </span>
                </div>
                <span>
                  {event.description && (
                    <p className="text-xs text-white/60 mt-3 line-clamp-3">
                      {event.description.split("\n").map((line, index) => (
                        <span key={index}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </p>
                  )}
                </span>
                <button
                  onClick={() => setSelectedEvent(event)}
                  className="mt-4 w-full px-3 py-1 rounded-lg bg-black/5 text-white hover:bg-white/10 border border-white/10 transition-all duration-300 text-xs"
                >
                  Edit
                </button>
              </div>
            ))
          ) : (
            <p className="text-center italic text-white/40">
              No past events available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalPastEventModal;
