import { useState, useRef, useEffect } from "react";
import { ExternalLink, Eye } from "lucide-react";
import eventBus from "../../utils/eventBus";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { syncLocalEventsWithFirestore } from "../../utils/syncLocalEvents";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

const SelectedLocalEventModal = ({
  selectedEvent,
  setEditableEvent,
  editableEvent,
  setSelectedEvent,
  saveEvents,
  setEvents,
  events = [],
  isLoaded,
  checkOnlineStatus,
  isOnline,
}) => {
  const [showPreview, setShowPreview] = useState(false);
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
          defaultValue: editableEvent.location || "",
        }
      : undefined
  );

  const handleSelect = async (description) => {
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);

      setPlacesValue(description, false);
      setEditableEvent((prev) => ({
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
      setEditableEvent((prev) => ({
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
    setEditableEvent((prev) => ({ ...prev, location: value }));
    setIsOpen(true);
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

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditableEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!editableEvent.title || editableEvent.title.trim() === "") {
      showNotification("Event title cannot be empty.");
      return;
    }
    if (!selectedEvent) return;

    await checkOnlineStatus();

    const updatedEvents = events.map((event) =>
      event.id === selectedEvent.id
        ? {
            ...event,
            ...editableEvent,
            date_start: editableEvent.date_start || null,
            date_end: editableEvent.date_end || null,
            time_start: editableEvent.time_start || null,
            time_end: editableEvent.time_end || null,
            updated_at: new Date().toISOString(),
            pending_sync: !isOnline,
          }
        : event
    );

    setEvents(updatedEvents);
    await saveEvents(updatedEvents);
    eventBus.emit("events_updated");

    // If you're online, call the sync function so the DB is updated:
    if (isOnline) {
      await syncLocalEventsWithFirestore(updatedEvents, setEvents, saveEvents);
    }

    setShowPreview(true);
    setSelectedEvent(null);
    setEditableEvent({});
  };

  const handleDateChange = (field, value) => {
    setEditableEvent((prev) => {
      const newEvent = { ...prev };

      if (field === "date_start") {
        newEvent.date_start = value;
        // If end date exists and is before start date, set end date to start date
        if (newEvent.date_end && newEvent.date_end < value) {
          newEvent.date_end = value;
        }
      } else if (field === "date_end") {
        newEvent.date_end = value;
        // If start date exists and is after end date, set start date to end date
        if (newEvent.date_start && newEvent.date_start > value) {
          newEvent.date_start = value;
        }
      }

      return newEvent;
    });
  };

  const handleTimeChange = (field, value) => {
    setEditableEvent((prev) => {
      const newEvent = { ...prev };

      if (field === "time_start") {
        newEvent.time_start = value;
        // If dates are the same and end time exists and is before start time
        if (
          newEvent.date_start === newEvent.date_end &&
          newEvent.time_end &&
          newEvent.time_end < value
        ) {
          newEvent.time_end = value;
        }
      } else if (field === "time_end") {
        newEvent.time_end = value;
        // If dates are the same and start time exists and is after end time
        if (
          newEvent.date_start === newEvent.date_end &&
          newEvent.time_start &&
          newEvent.time_start > value
        ) {
          newEvent.time_start = value;
        }
      }

      return newEvent;
    });
  };

  const handleClearTime = (field) => {
    setEditableEvent((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    const updatedEvents = events.filter(
      (event) => event.id !== selectedEvent.id
    );

    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    eventBus.emit("events_updated");
    setShowPreview(ready);
    setSelectedEvent(null);
    await deleteDoc(doc(db, "Local Events", selectedEvent.id));
  };

  const showNotification = (message, duration = 2500) => {
    setNotification(message);
    setTimeout(() => setNotification(null), duration);
  };

  const Notification = ({ message, onClose, duration = 2500 }) => {
    useEffect(() => {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
      <div className="fixed top-5 right-5 z-50 bg-gray-950/70 text-white px-6 py-2 rounded-lg shadow-lg flex flex-col items-start">
        <div className="flex justify-between items-center w-full">
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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl"></div>

      {/* Modal Container */}
      <div
        data-tauri-drag-region
        className="relative bg-black/70 rounded-3xl border border-white/10 shadow-2xl p-8 w-full max-w-xl overflow-hidden"
      >
        <button
          onClick={() => {
            setShowPreview(true);
            setSelectedEvent(null);
          }}
          className="px-3 py-1 absolute top-3 right-3 rounded-full hover:rotate-90 text-white/60 hover:text-white duration-300"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6">
          <input
            type="text"
            name="title"
            value={
              editableEvent.title !== undefined
                ? editableEvent.title
                : selectedEvent.title
            }
            onChange={handleEditChange}
            placeholder="Event Title"
            className="w-full text-2xl border-b border-white border-opacity-0 focus:border-opacity-100 font-semibold duration-300 text-white text-center bg-transparent outline-none placeholder-white/40"
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
          />
        </div>

        {/* Location */}
        <div className="relative mb-4">
          <input
            type="text"
            name="location"
            value={editableEvent.location || ""}
            onChange={handleInput}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            placeholder="Event Location"
            className="w-full placeholder:italic text-sm text-white/60 text-center bg-transparent border-b border-white border-opacity-0 duration-300 focus:border-opacity-100  outline-none placeholder-white/40"
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

        {/* Description */}
        <div className="mb-6 relative">
          <div className="absolute top-2 right-2 z-10 flex space-x-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="bg-cyan-500/20 text-cyan-200 px-2 py-1 rounded-md text-xs hover:bg-cyan-500/30 transition-all duration-300"
            >
              {showPreview ? <Eye size={16} /> : "Edit"}
            </button>
          </div>
          {showPreview ? (
            <textarea
              ref={(node) => {
                if (node) node.focus();
              }}
              name="description"
              placeholder="Event Notes"
              value={editableEvent.description || ""}
              onChange={handleEditChange}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="w-full bg-gray-800/30 h-96 text-white p-3 rounded-lg border border-white/10 focus:border-white/20 placeholder-white/40 outline-none resize-none"
            />
          ) : (
            <div className="w-full h-96 bg-gray-800/30  text-white p-3 rounded-lg border border-white/10 hover:border-white/20 transition-all">
              {editableEvent.description ? (
                editableEvent.description.split("\n").map((line, index) => (
                  <p key={index} className="text-sm text-white mt-1">
                    {line}
                  </p>
                ))
              ) : (
                <span className="italic text-white/40">No description</span>
              )}
            </div>
          )}
        </div>

        {/* Date and Time */}
        <div className="flex flex-col gap-4 text-sm text-white/60">
          <div className="flex gap-4">
            <div
              className="flex-1 cursor-pointer bg-gray-800/30  border border-white/10 p-2 rounded-lg hover:border-white/20"
              onClick={() => handleContainerClick(startDateRef)}
            >
              <label className="block mb-1 text-white/40 text-xs">
                Start Date
              </label>
              <input
                type="date"
                ref={startDateRef}
                value={editableEvent.date_start || ""}
                onChange={(e) => handleDateChange("date_start", e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>

            <div
              className="flex-1 cursor-pointer bg-gray-800/30 border border-white/10 p-2 rounded-lg hover:border-white/20"
              onClick={() => handleContainerClick(endDateRef)}
            >
              <label className="block mb-1 text-white/40 text-xs">
                End Date
              </label>
              <input
                type="date"
                ref={endDateRef}
                value={editableEvent.date_end || ""}
                onChange={(e) => handleDateChange("date_end", e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 bg-gray-800/30 border relative border-white/10 p-2 rounded-lg hover:border-white/20">
              <label className="block mb-1 text-white/40 text-xs">
                Start Time
              </label>
              <div className="flex items-center">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleContainerClick(timeStartRef)}
                >
                  <input
                    type="time"
                    ref={timeStartRef}
                    value={editableEvent.time_start || ""}
                    onChange={(e) =>
                      handleTimeChange("time_start", e.target.value)
                    }
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
                {editableEvent.time_start && (
                  <button
                    onClick={() => handleClearTime("time_start")}
                    className="p-1 hover:bg-red-500/30 group duration-150 rounded-lg text-xs px-2 absolute bg-red-500/20 right-1 bottom-1 transition-colors"
                  >
                    <span className="text-white/60 duration-150 group-hover:text-white">
                      clear
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 bg-gray-800/30 border border-white/10 p-2 relative rounded-lg hover:border-white/20">
              <label className="block mb-1 text-white/40 text-xs">
                End Time
              </label>
              <div className="flex items-center">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleContainerClick(timeEndRef)}
                >
                  <input
                    type="time"
                    ref={timeEndRef}
                    value={editableEvent.time_end || ""}
                    onChange={(e) =>
                      handleTimeChange("time_end", e.target.value)
                    }
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
                {editableEvent.time_end && (
                  <button
                    onClick={() => handleClearTime("time_end")}
                    className="p-1 hover:bg-red-500/30 group duration-150 rounded-lg text-xs px-2 absolute bg-red-500/20 right-1 bottom-1 transition-colors"
                  >
                    <span className="text-white/60 duration-150 group-hover:text-white">
                      clear
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          {/^https?:\/\/[^\s]+$/.test(selectedEvent.location) && (
            <a
              href={selectedEvent.location}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg hover:bg-white/10 text-white border border-white/20 transition-all duration-300 text-center block"
            >
              <div className="flex text-sm items-center justify-center gap-2">
                <ExternalLink size={17} />
                <p>Open Link</p>
              </div>
            </a>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 text-xs">
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg bg-black/5 text-white hover:bg-white/10 border border-white/10 transition-all duration-300"
            >
              SAVE
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 rounded-lg bg-red-500/20 text-white hover:bg-red-500/30 border border-red-400 transition-all duration-300"
            >
              DELETE
            </button>
          </div>
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

export default SelectedLocalEventModal;
