import React from "react";

const CustomInfoWindow = ({ event }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden w-72">
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 mb-2">
          {event.title}
        </h3>
        <div className="space-y-2">
          {event.date_start && (
            <p className="text-sm text-gray-600">
              <span className="font-medium"></span>
              {new Date(event.date_start).toLocaleDateString()}
            </p>
          )}
          {event.location && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Location: </span>
              {event.location}
            </p>
          )}
          {event.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() =>
              window.open(
                `https://maps.google.com/?q=${event.latitude},${event.longitude}`,
                "_blank"
              )
            }
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            View on Google Maps →
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomInfoWindow;
