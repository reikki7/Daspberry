import React, { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/tauri";
import { PlusCircle, CalendarFold, MapPin } from "lucide-react";
import FallbackImage from "../assets/fallback-image-events.jpg";
import eventBus from "../utils/eventBus";

const LocalEvents = () => {
  const [events, setEvents] = useState([]);
  const [newEventModalOpen, setNewEventModalOpen] = useState(false);
  const [imageCache, setImageCache] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editableEvent, setEditableEvent] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [isEventAvailable, setIsEventAvailable] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date_start: "",
    date_end: "",
    location: "",
  });

  const pixabayApiKey = import.meta.env.VITE_PIXABAY_API_KEY;

  const filterTitle = (title) => {
    const excludedWords = [
      "Meetup",
      "Conference",
      "Webinar",
      "Tour",
      "Reunion",
      "Project",
    ];

    // Remove symbols and special characters
    const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, "");

    // Split into words, filter excluded words, and join back into a string
    const words = cleanTitle.split(" ");
    return words
      .filter((word) => word && !excludedWords.includes(word)) // Exclude unwanted words and empty strings
      .join(" ");
  };

  const loadEvents = async () => {
    try {
      const loadedEvents = await invoke("load_local_events");
      if (Array.isArray(loadedEvents)) setEvents(loadedEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // is event available
  useEffect(() => {
    if (events.length > 0) {
      setIsEventAvailable(true);
    } else {
      setIsEventAvailable(false);
    }
  }, [events]);

  useEffect(() => {
    if (selectedEvent) {
      setEditableEvent({
        ...selectedEvent,
        date_start: selectedEvent.date_start
          ? new Date(selectedEvent.date_start).toISOString().substring(0, 10)
          : "",
        date_end: selectedEvent.date_end
          ? new Date(selectedEvent.date_end).toISOString().substring(0, 10)
          : "",
      });
    }
  }, [selectedEvent]);

  const saveEvents = async (updatedEvents) => {
    try {
      await invoke("save_local_events", { events: updatedEvents });
      eventBus.emit("events_updated");
    } catch (error) {
      console.error("Error saving events:", error);
    }
  };

  const clearEvents = async () => {
    try {
      await invoke("clear_local_events");
      setEvents([]);
    } catch (error) {
      console.error("Error clearing events:", error);
    }
  };

  const handleAddEvent = () => {
    if (!newEvent.title.trim()) {
      alert("Event title cannot be empty.");
      return;
    }

    const newEventEntry = {
      id: uuidv4(),
      ...newEvent,
    };
    const updatedEvents = [...events, newEventEntry];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    setNewEvent({
      title: "",
      description: "",
      date_start: "",
      date_end: "",
      location: "",
    });
    eventBus.emit("events_updated");
    setNewEventModalOpen(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditableEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!selectedEvent) return;

    // Update the selected event with the editableEvent values
    const updatedEvents = events.map((event) =>
      event.id === selectedEvent.id
        ? {
            ...event,
            ...editableEvent,
            date_start: editableEvent.date_start || null, // Clear if empty
            date_end: editableEvent.date_end || null, // Clear if empty
          }
        : event
    );

    setEvents(updatedEvents);
    saveEvents(updatedEvents); // Persist changes
    eventBus.emit("events_updated");
    setSelectedEvent(null); // Close modal
    setEditableEvent({}); // Reset editableEvent state
  };

  const handleDelete = () => {
    if (!selectedEvent) return;

    // Filter out the selected event
    const updatedEvents = events.filter(
      (event) => event.id !== selectedEvent.id
    );

    // Update the state
    setEvents(updatedEvents);

    // Persist the changes
    saveEvents(updatedEvents);

    eventBus.emit("events_updated");

    // Reset selectedEvent state
    setSelectedEvent(null);
  };

  const preloadImages = useCallback(async () => {
    const updatedCache = { ...imageCacheRef.current }; // Use a ref to track changes

    const getPixabayImage = async (keyword) => {
      try {
        const filteredKeyword = filterTitle(keyword);
        const response = await fetch(
          `https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(
            filteredKeyword
          )}&image_type=photo&pretty=true`
        );
        const data = await response.json();
        if (data.hits?.length > 0) return data.hits[0].webformatURL;
      } catch (error) {
        console.error("Error fetching image from Pixabay:", error);
      }
      return FallbackImage;
    };

    let hasUpdates = false;
    for (const event of events) {
      if (!updatedCache[event.id]) {
        const imageUrl = await getPixabayImage(event.title);
        updatedCache[event.id] = imageUrl;
        hasUpdates = true; // Mark if there are updates
      }
    }

    if (hasUpdates) {
      imageCacheRef.current = updatedCache; // Update ref
      setImageCache(updatedCache); // Set state only if updated
    }
  }, [events, pixabayApiKey]);

  // useRef to hold the cache
  const imageCacheRef = useRef(imageCache);

  useEffect(() => {
    if (events.length > 0) {
      preloadImages();
    }
  }, [events, preloadImages]);

  useEffect(() => {
    if (events.length > 0) {
      preloadImages();
    }
  }, [events, preloadImages]);

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl flex gap-2 items-center">
          <CalendarFold />
          Upcoming Events
        </h1>
        <button
          onClick={() => setNewEventModalOpen(true)}
          className="flex items-center gap-2 text-sm overflow-hidden bg-blue-500/20 hover:bg-purple-500/20 duration-300 text-white px-3 py-1 rounded-md"
        >
          <PlusCircle size={18} className="mr-2" />{" "}
          <p className="text-sm mt-0.5">Add Event</p>
        </button>
        {/* Clear Events
        <button
          onClick={clearEvents}
          className="flex items-center gap-2 text-sm overflow-hidden bg-red-500/20 hover:bg-red-600/20 duration-300 text-white px-3 py-1 rounded-l-md"
        >
          <Trash2 size={18} className="mr-2" />{" "}
          <p className="text-sm mt-0.5">Clear Events</p>
        </button> */}
      </div>

      {!isEventAvailable && (
        <div className="flex items-center justify-center h-[74px] w-[1240px] text-white">
          <p className="text-md">
            No upcoming events. Click on the &quot;Add Event&quot; button to
            create a new event.
          </p>
        </div>
      )}

      {/* Events Cards */}
      <div
        className={`grid grid-cols-1 ${
          isEventAvailable ? "h-[274px]" : "h-0"
        } w-[1240px] rounded-xl md:grid-cols-2 lg:grid-cols-4 gap-6`}
      >
        {events.map((event) => (
          <button
            key={event.id}
            className="relative w-full max-w-md mx-auto group overflow-hidden 
  rounded-2xl hover:border hover:border-cyan-600/50 
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

            {/* Content Container */}
            <div className="relative z-10 p-5 text-left text-cyan-50 flex items-center">
              {/* Left Content */}
              <div className="flex-grow pr-4">
                {/* Event Title */}
                <h2
                  className="text-2xl font-orbitron font-bold 
                text-transparent bg-clip-text 
                bg-gradient-to-r from-white to-cyan-200 
                mb-2 tracking-wide"
                >
                  {event.title}
                </h2>

                {/* Location */}
                {event.location && (
                  <div className="text-xs text-cyan-300 flex items-center gap-1.5">
                    <MapPin size={12} className="text-cyan-500" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>

              {/* Date Section */}
              {event.date_start && (
                <div
                  className="flex flex-col text-center 
    bg-gray-950/20 border border-cyan-500/30 
    rounded-xl overflow-hidden w-12 min-w-[3rem] 
    items-center text-white shadow-lg date-card"
                >
                  <div className="bg-cyan-600/30 w-full py-1 text-xs uppercase tracking-wider">
                    {new Date(event.date_start).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </div>
                  <div
                    className="text-xl w-full font-orbitron font-bold py-2 
        bg-gradient-to-br from-cyan-400/10 to-blue-600/10"
                  >
                    {new Date(event.date_start).toLocaleDateString("en-US", {
                      day: "numeric",
                    })}
                  </div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Event Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

          {/* Modal Container */}
          <div
            data-tauri-drag-region
            className="relative bg-slate-900/20 backdrop-blur-sm rounded-xl p-8 w-full max-w-lg border border-cyan-500/20 shadow-2xl shadow-cyan-500/20"
          >
            <button
              onClick={() => {
                setShowPreview(true);
                setSelectedEvent(null);
              }}
              className="px-3 py-1 absolute top-2 right-2 rounded-lg bg-slate-800/80 text-cyan-400 border border-cyan-500/30 hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300"
            >
              <span className="block text-md">x</span>
            </button>
            {/* Decorative Corners */}
            <div className="absolute top-0 left-0 w-10 h-10 border-l border-t border-cyan-400 rounded-tl-lg"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-r border-b border-cyan-400 rounded-br-lg"></div>

            {/* Header */}
            <div className="mb-6">
              <input
                type="text"
                name="title"
                value={editableEvent.title || selectedEvent.title}
                onChange={handleEditChange}
                placeholder="Event Title"
                className="w-full text-2xl font-bold text-white text-center bg-transparent border-none outline-none placeholder-gray-400"
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>

            {/* Location */}
            <div className="mb-4">
              <input
                type="text"
                name="location"
                value={editableEvent.location || selectedEvent.location}
                onChange={handleEditChange}
                placeholder="Event Location"
                className="w-full text-sm text-cyan-400 text-center bg-transparent border-none outline-none placeholder-gray-400"
              />
            </div>

            {/* Description */}
            <div className="mb-6 relative">
              <div className="absolute top-2 right-2 z-10 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="bg-cyan-500/20 text-cyan-200 px-2 py-1 rounded-md text-xs hover:bg-cyan-500/30 transition-all"
                >
                  {showPreview ? "Edit" : "Preview"}
                </button>
              </div>
              {!showPreview ? (
                <textarea
                  name="description" // Add this
                  placeholder="Event Notes"
                  value={editableEvent.description || ""}
                  onChange={handleEditChange}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full bg-slate-800/50 h-96 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none resize-none"
                />
              ) : (
                <div className="w-full bg-slate-800/50 h-96 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none resize-none">
                  <span>
                    <span>
                      {editableEvent.description
                        ? editableEvent.description
                            .split("\n")
                            .map((line, index) => {
                              if (line.startsWith("- ")) {
                                // Bullet point
                                return (
                                  <li
                                    key={index}
                                    className="list-disc ml-5 text-white"
                                  >
                                    {line.substring(2)}
                                  </li>
                                );
                              } else if (line.startsWith("### ")) {
                                // Heading level 3
                                return (
                                  <h3
                                    key={index}
                                    className="text-lg font-semibold text-white mt-2"
                                  >
                                    {line.substring(4)}
                                  </h3>
                                );
                              } else if (line.startsWith("## ")) {
                                // Heading level 2
                                return (
                                  <h2
                                    key={index}
                                    className="text-xl font-bold text-white mt-4"
                                  >
                                    {line.substring(3)}
                                  </h2>
                                );
                              } else if (line.startsWith("# ")) {
                                // Heading level 1
                                return (
                                  <h1
                                    key={index}
                                    className="text-2xl font-extrabold text-white mt-6"
                                  >
                                    {line.substring(2)}
                                  </h1>
                                );
                              } else {
                                // Regular paragraph
                                return (
                                  <p
                                    key={index}
                                    className="text-base text-white mt-1"
                                  >
                                    {line}
                                  </p>
                                );
                              }
                            })
                        : ""}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Date Picker */}
            <div className="flex items-center justify-between text-sm text-gray-300 gap-4">
              <div className="flex-1">
                <label className="block mb-1 text-cyan-400">Start Date</label>
                <input
                  type="date"
                  name="date_start"
                  value={editableEvent.date_start || ""}
                  onChange={handleEditChange}
                  className="w-full bg-slate-800/50 text-cyan-50 p-2 rounded-lg border border-cyan-500/30 focus:ring-1 focus:ring-cyan-400 outline-none"
                />
              </div>
              <div className="opacity-85 mt-6">to</div>
              <div className="flex-1">
                <label className="block mb-1 text-cyan-400">End Date</label>
                <input
                  type="date"
                  name="date_end"
                  value={editableEvent.date_end || ""}
                  onChange={handleEditChange}
                  className="w-full bg-slate-800/50 text-cyan-50 p-2 rounded-lg border border-cyan-500/30 focus:ring-1 focus:ring-cyan-400 outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-lg hover:bg-cyan-500 hover:text-white border border-cyan-500 text-cyan-500 transition-all duration-300"
              >
                保存
                <span className="block text-xs">SAVE</span>
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 rounded-lg hover:bg-red-500 hover:text-white border border-red-500 text-red-400 transition-all duration-300"
              >
                削除
                <span className="block text-xs">DELETE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {newEventModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop with cyber effect */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

          {/* Modal Container */}
          <div className="relative bg-slate-900/20 backdrop-blur-sm rounded-xl p-8 w-full max-w-md border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
            <button
              onClick={() => {
                setNewEvent({
                  title: "",
                  description: "",
                  start_date: "",
                  end_date: "",
                  location: "",
                });
                setNewEventModalOpen(false);
              }}
              className="px-3 py-1 absolute top-2 right-2 rounded-lg bg-slate-800/80 text-cyan-400 border border-cyan-500/30 hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300"
            >
              <span className="block text-md">x</span>
            </button>
            {/* Decorative corner elements */}
            <div className="absolute top-0 left-0 w-16 h-16 border-l border-t border-cyan-400 rounded-tl-xl"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r border-b border-cyan-400 rounded-br-xl"></div>

            {/* Header */}
            <h2 className="text-2xl font-bold mb-6 text-white text-center">
              新しいイベント
              <span className="block text-sm text-cyan-400 mt-1">
                NEW EVENT
              </span>
            </h2>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Event Title"
                  value={newEvent.title}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNewEvent((prev) => ({ ...prev, title: e.target.value }));
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full bg-slate-800/50 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none"
                />
              </div>

              <div className="relative">
                <textarea
                  placeholder="Event Description"
                  value={newEvent.description}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation;
                    setNewEvent((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }));
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full bg-slate-800/50 h-64 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <input
                  type="date"
                  value={newEvent.date_start}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      date_start: e.target.value,
                    })
                  }
                  className="w-1/2 bg-slate-800/50 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none"
                />
                <input
                  type="date"
                  value={newEvent.date_end}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      date_end: e.target.value,
                    })
                  }
                  className="w-1/2 bg-slate-800/50 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none"
                />
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Event Location"
                  value={newEvent.location}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation;
                    setNewEvent({ ...newEvent, location: e.target.value });
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full bg-slate-800/50 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleAddEvent}
                className="px-6 py-2 text-sm rounded-lg hover:bg-cyan-500 hover:text-white border border-cyan-500 text-cyan-500 transition-all duration-300"
              >
                保存
                <span className="block text-xs">SAVE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalEvents;
