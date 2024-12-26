import { FaCalendarAlt, FaClock } from "react-icons/fa";

const GoogleCalendarEventCards = ({
  sortedAndFilteredEvents,
  setSelectedEvent,
  formatEventTime,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
      {sortedAndFilteredEvents.map((event, index) => (
        <button
          key={index}
          className="flex flex-col bg-gray-950/40  
        rounded-2xl 
        shadow-lg hover:shadow-cyan-600/40 duration-300
        backdrop-blur-md hover:backdrop-blur-lg h-[320px] overflow-hidden"
          type="button"
          onClick={() => setSelectedEvent(event)}
        >
          {/* Event Header */}
          <div className="p-4 border-b-2 w-full border-white/10">
            <div className="flex justify-between items-start gap-2 mb-2">
              <h3
                className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r 
            from-cyan-200 to-white
            transition-all duration-300 line-clamp-2"
              >
                {event.summary}
              </h3>
              {event.start && (
                <span className="text-xs px-3 py-1 bg-gray-950/30 rounded-full text-white whitespace-nowrap shadow-md">
                  {formatEventTime(new Date(event.start))}
                </span>
              )}
            </div>
          </div>

          {/* Event Body */}
          <div className="flex-1 p-4 w-full text-left overflow-y-auto">
            <div className="text-sm text-white">
              {event.start && (
                <div className="mb-3 flex flex-col">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-white -mt-0.5" />
                    {new Date(event.start).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>

                  <div className="flex items-center mt-2">
                    <FaClock className="text-white mr-2 -mt-0.5" />
                    {new Date(event.start).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(event.end).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
              {event.description && (
                <div
                  className="line-clamp-3 text-gray-400 mt-2"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              )}
            </div>
          </div>

          {/* Event Footer */}
          <div className="p-4 w-full">
            {event.location ? (
              <div className="relative w-full max-w-xs group">
                {/* Base gradient - always visible */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-xl transition-opacity duration-300" />

                {/* Hover gradient - opacity controlled by group-hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/50 to-purple-500/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Button content */}
                <a
                  href="#"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="relative w-full flex justify-center items-center px-4 py-2 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  Join Meeting
                </a>
              </div>
            ) : (
              <span className="block text-center text-sm text-gray-400">
                No meeting link
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default GoogleCalendarEventCards;
