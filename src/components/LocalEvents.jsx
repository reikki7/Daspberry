import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/tauri";
import {
  CalendarIcon,
  Trash2,
  Pencil,
  PlusCircle,
  CalendarFold,
  MapPin,
} from "lucide-react";

const LocalEvents = () => {
  const [events, setEvents] = useState([]);
  const [newEventModalOpen, setNewEventModalOpen] = useState(false);
  const [imageCache, setImageCache] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editableEvent, setEditableEvent] = useState({});
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

    // Reset selectedEvent state
    setSelectedEvent(null);
  };

  const preloadImages = async () => {
    const updatedCache = { ...imageCache };

    for (const event of events) {
      if (!updatedCache[event.id]) {
        const imageUrl = await getPixabayImage(event.title);
        updatedCache[event.id] = imageUrl;
      }
    }

    setImageCache(updatedCache);
  };

  useEffect(() => {
    if (events.length > 0) {
      preloadImages();
    }
  }, [events]);

  const getPixabayImage = async (keyword) => {
    try {
      // Filter the keyword to exclude unwanted words
      const filteredKeyword = filterTitle(keyword);
      const response = await fetch(
        `https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(
          filteredKeyword
        )}&image_type=photo&pretty=true`
      );
      const data = await response.json();
      if (data.hits && data.hits.length > 0) {
        return data.hits[0].webformatURL;
      }
    } catch (error) {
      console.error("Error fetching image from Pixabay:", error);
    }
    return "https://via.placeholder.com/400x300?text=No+Image"; // Fallback image
  };

  let animationFrame;

  const handleMouseMove = (e, card) => {
    if (animationFrame) cancelAnimationFrame(animationFrame);

    animationFrame = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // X position within the card
      const y = e.clientY - rect.top; // Y position within the card
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Invert the Y-axis rotation by flipping the sign
      const rotateX = ((centerY - y) / centerY) * 10; // Tilt range: -10 to 10 degrees
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
  };

  const handleMouseLeave = (card) => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    card.style.transform = "rotateX(0) rotateY(0)"; // Reset tilt on mouse leave
  };

  //   TODO: Fix image blur on hover
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
      {/* Events Cards */}
      <div className="grid grid-cols-1 h-72 w-[1240px] rounded-xl md:grid-cols-2 lg:grid-cols-4 gap-6 tilt-card-container">
        {events.map((event) => (
          <button
            key={event.id}
            className="relative bg-white shadow-lg rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 tilt-card"
            style={{
              backgroundImage: `url(${imageCache[event.id] || ""})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
            onMouseLeave={(e) => handleMouseLeave(e.currentTarget)}
            onClick={() => setSelectedEvent(event)}
          >
            <div
              className="absolute bottom-0 left-0 rounded-xl right-0 h-32"
              style={{
                backdropFilter: "blur(5px)",
                pointerEvents: "none",
                background:
                  "linear-gradient(to top, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0))",
                "-webkit-mask":
                  "-webkit-gradient(linear, left 30%, left 0%, from(rgba(0, 0, 0, 1)),to(rgba(0, 0, 0, 0)))",
              }}
            />

            {/* Content positioned at the bottom-left */}
            <div className="absolute w-[260px] bottom-4 left-4 z-10 text-white">
              <div className="flex justify-between items-center">
                <div>
                  {/* Title */}
                  <h2 className="text-xl text-left font-bold mb-2 tracking-wide">
                    {event.title}
                  </h2>

                  {/* Description */}
                  {event.description && (
                    <p className="text-gray-200 text-left text-xs mb-2 line-clamp-1 truncate opacity-90">
                      {event.description || ""}
                    </p>
                  )}

                  {/* Location */}
                  {event.location && (
                    <div className="text-xs -ml-0.5 text-gray-300 text-left flex items-center gap-1">
                      <MapPin size={14} />
                      <div className="opacity-85 mt-0.5">
                        {event.location || ""}
                      </div>
                    </div>
                  )}
                </div>

                {/* Date */}
                {event.date_start && (
                  <div className="flex flex-col text-xs items-center border rounded-lg shadow-md">
                    <div className="flex justify-center items-center w-full bg-blue-800/50 text-white rounded-t-md p-1.5">
                      {new Date(event.date_start).toLocaleDateString("en-US", {
                        month: "short",
                      })}
                    </div>
                    <div className="flex justify-center items-center w-full p-2 font-bold border-t border-gray-300">
                      {new Date(event.date_start).toLocaleDateString("en-US", {
                        day: "numeric",
                      })}
                    </div>
                  </div>
                )}
              </div>
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
          <div className="relative bg-slate-900/20 backdrop-blur-sm rounded-xl p-8 w-full max-w-lg border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
            {/* Decorative Corners */}
            <div className="absolute top-0 left-0 w-10 h-10 border-l-2 border-t-2 border-cyan-400 rounded-tl-lg"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-r-2 border-b-2 border-cyan-400 rounded-br-lg"></div>

            {/* Header */}
            <div className="mb-6">
              <input
                type="text"
                name="title"
                value={editableEvent.title || selectedEvent.title}
                onChange={handleEditChange}
                placeholder="Event Title"
                className="w-full text-2xl font-bold text-white text-center bg-transparent border-none outline-none placeholder-gray-400"
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
            <div className="mb-6">
              <textarea
                name="description"
                value={editableEvent.description || selectedEvent.description}
                onChange={handleEditChange}
                placeholder="Event Description"
                className="w-full h-20 text-white text-sm bg-transparent border-none outline-none placeholder-gray-400 resize-none"
              />
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
                onClick={() => setSelectedEvent(null)}
                className="px-6 py-2 rounded-lg bg-slate-800/80 text-cyan-400 border border-cyan-500/30 hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300"
              >
                閉じる
                <span className="block text-xs">CLOSE</span>
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-all duration-300"
              >
                保存
                <span className="block text-xs">SAVE</span>
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-400 transition-all duration-300"
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
            {/* Decorative corner elements */}
            <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-400 rounded-tl-xl"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-cyan-400 rounded-br-xl"></div>

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
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                  className="w-full bg-slate-800/50 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none"
                />
              </div>

              <div className="relative">
                <textarea
                  placeholder="Event Description"
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                  className="w-full bg-slate-800/50 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none h-24 resize-none"
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
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, location: e.target.value })
                  }
                  className="w-full bg-slate-800/50 text-cyan-50 p-3 rounded-lg border border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-cyan-200/30 transition-all outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setNewEventModalOpen(false)}
                className="px-6 py-2 rounded-lg bg-slate-800/80 text-cyan-400 border border-cyan-500/30 hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300"
              >
                キャンセル
                <span className="block text-xs">CANCEL</span>
              </button>
              <button
                onClick={handleAddEvent}
                className="px-6 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-all duration-300"
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
