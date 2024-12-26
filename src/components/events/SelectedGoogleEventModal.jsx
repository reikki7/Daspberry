import { FaCalendarAlt, FaClock, FaMapMarkerAlt } from "react-icons/fa";

const SelectedGoogleEventModal = ({ selectedEvent, setSelectedEvent }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl"></div>

      {/* Modal Container */}
      <div
        data-tauri-drag-region
        className="relative bg-black/70 rounded-3xl border border-white/10 shadow-2xl p-8 w-full max-w-xl"
      >
        {/* Close Button */}
        <button
          onClick={() => setSelectedEvent(null)}
          className="px-3 py-1 absolute top-3 right-3 rounded-full hover:rotate-90 text-white/60 hover:text-white duration-300"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">
            {selectedEvent.summary}
          </h2>
        </div>

        {/* Event Details */}
        <div className="space-y-6 text-sm text-white/70">
          {/* Date & Time */}
          {selectedEvent.start && (
            <div className="flex gap-2">
              <div className="w-fit">
                <span className="flex items-center gap-2 bg-white/5 px-5 py-2 rounded-md">
                  <FaCalendarAlt className="text-blue-400 -mt-0.5" />
                  <span>
                    {new Date(selectedEvent.start).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
              </div>
              <div>
                <span className="inline-flex items-center gap-2 bg-white/5 px-5 py-2 rounded-md">
                  <FaClock className="text-blue-400 -mt-0.5" />
                  <span>
                    {new Date(selectedEvent.start).toLocaleString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {" - "}
                  <span>
                    {new Date(selectedEvent.end).toLocaleString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Location */}
          {selectedEvent.location && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md">
              <FaMapMarkerAlt className="text-purple-400/80 -mt-0.5" />
              <a
                href={selectedEvent.location}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition duration-300"
              >
                {selectedEvent.location}
              </a>
            </div>
          )}

          {/* Description */}
          {selectedEvent.description && (
            <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50 shadow-md">
              <p className="text-white/70 leading-relaxed">
                {selectedEvent.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectedGoogleEventModal;
