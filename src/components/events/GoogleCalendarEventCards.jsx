import { FaCalendarAlt, FaClock } from "react-icons/fa";

const GoogleCalendarEventCards = ({
  sortedAndFilteredEvents,
  setSelectedEvent,
  formatEventTime,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
      {sortedAndFilteredEvents.map((event, index) => (
        <button
          key={index}
          className="flex flex-col bg-gradient-to-br from-gray-900/40 via-gray-800/45 to-gray-900/40  
          rounded-xl border border-gray-700/50 hover:border-gray-600/50
          shadow-lg hover:shadow-xl transition-all duration-300
          backdrop-blur-sm hover:backdrop-blur-md h-[320px]"
          type="button"
          onClick={() => setSelectedEvent(event)}
        >
          {/* Event Header */}
          <div className="p-4 border-b w-full text-left border-gray-700/50">
            <div className="flex justify-between items-start gap-2 mb-2">
              <h3 className="text-lg font-bold text-cyan-300 line-clamp-2">
                {event.summary}
              </h3>
              {event.start && (
                <span className="text-xs px-2 py-1 bg-gray-800 rounded-full text-gray-300 whitespace-nowrap">
                  {formatEventTime(new Date(event.start))}
                </span>
              )}
            </div>
          </div>

          {/* Event Body */}
          <div className="flex-1 p-4 w-full text-left overflow-y-auto">
            <div className="text-sm text-gray-300 mb-2">
              {event.start && (
                <div className="mb-1 flex flex-col">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-purple-200 mr-1" />
                    {new Date(event.start).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const now = new Date();
                        const timeDifference = new Date(event.start) - now;

                        if (timeDifference < 0) return "(event has passed)";

                        const yearsDifference = Math.floor(
                          timeDifference / (1000 * 60 * 60 * 24 * 365.25)
                        );
                        const monthsDifference = Math.floor(
                          timeDifference / (1000 * 60 * 60 * 24 * 30.44)
                        );
                        const daysDifference = Math.floor(
                          timeDifference / (1000 * 60 * 60 * 24)
                        );
                        const hoursDifference = Math.floor(
                          (timeDifference % (1000 * 60 * 60 * 24)) /
                            (1000 * 60 * 60)
                        );
                        const minutesDifference = Math.floor(
                          (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
                        );

                        switch (true) {
                          case yearsDifference > 0:
                            return `(in ${yearsDifference} ${
                              yearsDifference === 1 ? "year" : "years"
                            })`;
                          case monthsDifference > 0:
                            return `(in ${monthsDifference} ${
                              monthsDifference === 1 ? "month" : "months"
                            })`;
                          case daysDifference > 14:
                            return `(in ${Math.ceil(
                              daysDifference / 7
                            )} weeks)`;
                          case daysDifference > 6:
                            return "(next week)";
                          case daysDifference > 1:
                            return `(in ${daysDifference} days)`;
                          case daysDifference === 1:
                            return "(tomorrow)";
                          case hoursDifference > 0:
                            return `(in ${hoursDifference} hours)`;
                          default:
                            return `(in ${minutesDifference} minutes)`;
                        }
                      })()}
                    </p>
                  </div>

                  <div className="flex items-center">
                    <FaClock className="text-purple-200 mr-3" />
                    {new Date(event.start).toLocaleString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(event.end).toLocaleString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
              {event.description && (
                <div
                  className="line-clamp-3 text-gray-400 mt-2 "
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              )}
            </div>
          </div>

          {/* Event Footer */}
          <div className="p-4 border-t w-full border-gray-700/50">
            {event.location ? (
              <a
                href={event.location}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full flex justify-center items-center px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                text-cyan-400 rounded-lg font-medium
                transition-colors duration-200 hover:text-cyan-300"
              >
                Join Meeting
              </a>
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
