import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import eventBus from "../../utils/eventBus";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { syncLocalEventsWithFirestore } from "../../utils/syncLocalEvents";

const NewLocalEventModal = ({
  setNewEventModalOpen,
  saveEvents,
  setEvents,
  events = [],
  isLoaded,
  checkOnlineStatus,
  isOnline,
}) => {
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date_start: "",
    date_end: "",
    time_start: "",
    time_end: "",
    location: "",
    latitude: null,
    longitude: null,
    updated_at: "",
    pending_sync: !isOnline,
  });

  const [notification, setNotification] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const timeStartRef = useRef(null);
  const timeEndRef = useRef(null);

  const {
    ready,
    suggestions: { status, data },
    setValue: setPlacesValue,
    clearSuggestions,
  } = usePlacesAutocomplete(
    isLoaded
      ? {
          requestOptions: {},
          debounce: 300,
          defaultValue: newEvent.location,
        }
      : undefined
  );

  const handleSelect = async (description) => {
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);

      setPlacesValue(description, false);
      setNewEvent((prev) => ({
        ...prev,
        location: description,
        latitude: lat,
        longitude: lng,
      }));
      clearSuggestions();
      setIsOpen(false);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      setPlacesValue(description, false);
      setNewEvent((prev) => ({
        ...prev,
        location: description,
        latitude: null,
        longitude: null,
      }));
      clearSuggestions();
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const handleInput = (e) => {
    const value = e.target.value;
    setPlacesValue(value);
    setNewEvent((prev) => ({ ...prev, location: value }));
    setIsOpen(ready);
    setSelectedIndex(-1);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && data[selectedIndex]) {
          handleSelect(data[selectedIndex].description);
        } else {
          setIsOpen(false);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < data.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleContainerClick = (ref) => {
    if (ref.current) {
      ref.current.showPicker?.();
    }
  };

  const Notification = ({ message, onClose, duration = 2500 }) => {
    useEffect(() => {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
      <div className="fixed top-5 right-5 z-50 bg-gray-950/70 text-white px-4 py-2 rounded-lg shadow-lg flex flex-col items-start">
        <div className="flex justify-betweenitems-center w-full">
          <span>{message}</span>
          <button
            onClick={onClose}
            className="ml-2 hover:rotate-90 duration-300 px-2 py-1 rounded-md"
          >
            ✕
          </button>
        </div>
        <div className="w-full h-1 rounded mt-2 overflow-hidden relative">
          <div
            className="absolute top-0 left-0 h-full bg-red-700"
            style={{
              animation: `progress ${duration}ms linear forwards`,
            }}
          ></div>
        </div>
        <style>
          {`
          @keyframes progress {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
        `}
        </style>
      </div>
    );
  };

  const showNotification = (message, duration = 2500) => {
    setNotification(message);
    setTimeout(() => setNotification(null), duration);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      showNotification("Event title cannot be empty.");
      return;
    }

    await checkOnlineStatus();

    const newEventEntry = {
      id: uuidv4(),
      ...newEvent,
      updated_at: new Date().toISOString(),
      pending_sync: !isOnline,
    };
    const updatedEvents = [...events, newEventEntry];
    setEvents(updatedEvents);
    await saveEvents(updatedEvents);
    setNewEvent({
      title: "",
      description: "",
      date_start: "",
      date_end: "",
      time_start: "",
      time_end: "",
      location: "",
      latitude: null,
      longitude: null,
    });

    eventBus.emit("events_updated");
    setNewEventModalOpen(false);

    if (isOnline) {
      await syncLocalEventsWithFirestore(updatedEvents, setEvents, saveEvents);
    }
  };

  const clearTime = (field) => {
    setNewEvent((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl"></div>

      {/* Modal Container */}
      <div
        data-tauri-drag-region
        className="relative bg-black/70 rounded-3xl border border-white/10 shadow-2xl p-8 w-full max-w-xl"
      >
        <button
          onClick={() => {
            setNewEvent({
              title: "",
              description: "",
              date_start: "",
              date_end: "",
              location: "",
              latitude: null,
              longitude: null,
            });
            setNewEventModalOpen(false);
          }}
          className="px-3 py-1 absolute top-3 right-3 rounded-full hover:rotate-90 text-white/60 hover:text-white duration-300"
        >
          ✕
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold mb-6 text-white text-center">
          新しいイベント
          <span className="block text-sm text-white/60 mt-1">NEW EVENT</span>
        </h2>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Event Title"
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full bg-gray-800/30 text-white p-3 rounded-lg border border-gray-700/50 focus:border-white/30-400 focus:ring-1 focus:ring-white placeholder-cyan-200/30 transition-all outline-none"
            />
          </div>

          <div className="relative">
            <textarea
              placeholder="Event Description"
              value={newEvent.description}
              onChange={(e) =>
                setNewEvent((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full bg-gray-800/30 h-72 text-white p-3 rounded-lg border border-gray-700/50 focus:border-white/30 focus:ring-1 focus:ring-white placeholder-cyan-200/30 transition-all outline-none resize-none"
            />
          </div>

          <div className="relative">
            <input
              type="text"
              value={newEvent.location}
              onChange={handleInput}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              placeholder="Event Location"
              className="w-full bg-gray-800/30 text-white p-3 rounded-lg border border-gray-700/50 focus:border-white/30 focus:ring-1 focus:ring-white placeholder-cyan-200/30 transition-all outline-none"
            />
            {status === "OK" && isOpen && (
              <ul className="absolute z-50 w-full bg-black/90 mt-1 rounded-lg border border-gray-700/50 shadow-lg max-h-60 overflow-auto">
                {data.map(({ place_id, description }, index) => (
                  <li
                    key={place_id}
                    onClick={() => handleSelect(description)}
                    className={`px-4 py-2 text-white cursor-pointer transition-colors ${
                      index === selectedIndex
                        ? "bg-white/30"
                        : "hover:bg-white/20"
                    }`}
                  >
                    {description}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Other Fields */}
          <div className="flex gap-4">
            <div
              className="flex-1 cursor-pointer bg-gray-800/30 border border-gray-700/50 p-2 rounded-lg hover:border-cyan-400 transition-all duration-300"
              onClick={() => handleContainerClick(startDateRef)}
            >
              <label className="block mb-1 text-white/60 text-xs">
                Start Date
              </label>
              <input
                type="date"
                ref={startDateRef}
                value={newEvent.date_start}
                onChange={(e) =>
                  setNewEvent((prev) => ({
                    ...prev,
                    date_start: e.target.value,
                  }))
                }
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
            <div
              className="flex-1 cursor-pointer bg-gray-800/30 border border-gray-700/50 p-2 rounded-lg hover:border-cyan-400 transition-all duration-300"
              onClick={() => handleContainerClick(endDateRef)}
            >
              <label className="block mb-1 text-white/60 text-xs">
                End Date
              </label>
              <input
                type="date"
                ref={endDateRef}
                value={newEvent.date_end}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, date_end: e.target.value }))
                }
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <div
                className="cursor-pointer bg-gray-800/30 border border-gray-700/50 p-2 rounded-lg hover:border-cyan-400 transition-all duration-300"
                onClick={() => handleContainerClick(timeStartRef)}
              >
                <label className="block mb-1 text-white/60 text-xs">
                  Start Time
                </label>
                <input
                  type="time"
                  ref={timeStartRef}
                  value={newEvent.time_start}
                  onChange={(e) =>
                    setNewEvent((prev) => ({
                      ...prev,
                      time_start: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
              {newEvent.time_start && (
                <button
                  className="absolute top-2 right-2 bg-red-500/50 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-all"
                  onClick={() => clearTime("time_start")}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 relative">
              <div
                className="cursor-pointer bg-gray-800/30 border border-gray-700/50 p-2 rounded-lg hover:border-cyan-400 transition-all duration-300"
                onClick={() => handleContainerClick(timeEndRef)}
              >
                <label className="block mb-1 text-white/60 text-xs">
                  End Time
                </label>
                <input
                  type="time"
                  ref={timeEndRef}
                  value={newEvent.time_end}
                  onChange={(e) =>
                    setNewEvent((prev) => ({
                      ...prev,
                      time_end: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
              {newEvent.time_end && (
                <button
                  className="absolute top-2 right-2 bg-red-500/50 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-all"
                  onClick={() => clearTime("time_end")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleAddEvent}
            className="px-6 py-2 rounded-lg bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 hover:text-white border border-cyan-400 transition-all duration-300"
          >
            <span className="block text-xs">ADD</span>
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification}
          onClose={() => setNotification(null)}
          duration={2500}
        />
      )}
    </div>
  );
};

export default NewLocalEventModal;
