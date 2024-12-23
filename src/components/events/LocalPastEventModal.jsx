import { CalendarCheck2, MapPin } from "lucide-react";

const LocalPastEventModal = ({
  setPastEventsModalOpen,
  sortedPastEvents,
  setSelectedEvent,
  isSortedMostRecent,
  setIsSortedMostRecent,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute rounded-3xl inset-0 bg-black/70 backdrop-blur-sm"></div>

      {/* Modal Container */}
      <div className="relative bg-slate-900/20 backdrop-blur-lg rounded-lg p-6 w-full max-w-lg border border-cyan-500/30 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => setPastEventsModalOpen(false)}
          className="absolute top-2 right-2 p-2 text-cyan-400 hover:text-cyan-300 transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-7">
          <h2 className="text-xl font-semibold text-white">Past Events</h2>
          <p className="text-sm text-cyan-400">
            Review and manage your past activities.
          </p>
        </div>

        {/* Sort Button */}
        <div className="flex justify-end items-center mb-4">
          <button
            onClick={() => setIsSortedMostRecent((prev) => !prev)}
            className="px-3 py-1 text-sm bg-slate-800/50 border border-cyan-500/30 text-cyan-400 rounded-md hover:bg-cyan-500/20 hover:text-cyan-300 transition"
          >
            {isSortedMostRecent ? "Oldest First" : "Most Recent First"}
          </button>
        </div>

        {/* Past Events List */}
        <div className="space-y-4">
          {sortedPastEvents.length > 0 ? (
            sortedPastEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 bg-slate-800/50 rounded-md border border-cyan-500/20 hover:border-cyan-400 hover:shadow-lg transition"
              >
                <h3 className="text-lg font-medium text-white mb-2">
                  {event.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-cyan-300 mt-1">
                  <CalendarCheck2
                    size={16}
                    className="text-cyan-500 inline-block"
                  />
                  <p className="text-xs text-cyan-300">
                    {new Date(event.date_start).toLocaleDateString()}{" "}
                    {event.date_end
                      ? `– ${new Date(event.date_end).toLocaleDateString()}`
                      : ""}
                  </p>
                  {event.time_start && (
                    <p className="text-xs text-cyan-300">
                      {" • "}
                      {event.time_start}{" "}
                      {event.time_end ? `– ${event.time_end}` : ""}
                    </p>
                  )}
                </div>

                {event.location && (
                  <div className="flex items-center gap-2 text-xs text-cyan-300 mt-1">
                    <MapPin
                      size={12}
                      className="text-cyan-500 ml-0.5 inline-block"
                    />
                    <p className="text-sm text-cyan-500 mt-1">
                      {event.location}
                    </p>
                  </div>
                )}
                {event.description && (
                  <p className="text-sm text-white mt-2 line-clamp-3">
                    {event.description}
                  </p>
                )}
                <button
                  onClick={() => setSelectedEvent(event)}
                  className="mt-3 text-sm px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/20 hover:text-cyan-300 transition"
                >
                  Edit
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-cyan-300">
              No past events available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalPastEventModal;
