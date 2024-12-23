import { FaCalendarAlt, FaClock, FaMapMarkerAlt } from "react-icons/fa";

const SelectedGoogleEventModal = ({ selectedEvent, setSelectedEvent }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 rounded-3xl bg-black/70 backdrop-blur-sm"></div>

      {/* Modal Container */}
      <div
        className="relative bg-gradient-to-br from-indigo-900/20 via-blue-800/20 to-purple-900/20 
          backdrop-blur-lg rounded-xl p-8 w-full max-w-lg border border-indigo-700/50 shadow-2xl shadow-indigo-700/30"
      >
        {/* Close Button */}
        <button
          onClick={() => setSelectedEvent(null)}
          className="absolute top-2 right-2 px-3 py-1 rounded-lg duration-200 hover:text-purple-400 text-purple-300 transition-all"
        >
          ✕
        </button>

        {/* Decorative Corners */}
        <div className="absolute top-0 left-0 w-12 h-12 border-l border-t border-purple-500 rounded-tl-lg"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 border-r border-b border-purple-500 rounded-br-lg"></div>

        {/* Header */}
        <div className="mb-6">
          <h2
            className="text-2xl font-extrabold text-transparent bg-clip-text 
              bg-gradient-to-r from-purple-200 to-cyan-400 text-center mb-4"
          >
            {selectedEvent.summary}
          </h2>
        </div>

        {/* Details */}
        <div className="space-y-4 text-sm text-gray-300">
          {/* Date & Time */}
          {selectedEvent.start && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-purple-300" />
                {new Date(selectedEvent.start).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2">
                <FaClock className="text-purple-300" />
                {new Date(selectedEvent.start).toLocaleString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" - "}
                {new Date(selectedEvent.end).toLocaleString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          )}

          {/* Location */}
          {selectedEvent.location && (
            <div className="text-cyan-300 flex items-center gap-2">
              <FaMapMarkerAlt className="text-cyan-500" />
              <a
                href={selectedEvent.location}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-400 transition"
              >
                {selectedEvent.location}
              </a>
            </div>
          )}

          {/* Description */}
          {selectedEvent.description && (
            <div className="bg-indigo-900/30 p-4 rounded-lg border border-indigo-500/50">
              <p>{selectedEvent.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectedGoogleEventModal;
