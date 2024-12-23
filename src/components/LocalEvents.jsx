import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/tauri";
import {
  PlusCircle,
  CalendarFold,
  MapPin,
  CalendarCheck2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock8,
} from "lucide-react";
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
  const [pastEventsModalOpen, setPastEventsModalOpen] = useState(false);
  const [isSortedMostRecent, setIsSortedMostRecent] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date_start: "",
    date_end: "",
    time_start: "",
    time_end: "",
    location: "",
  });

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const timeStartRef = useRef(null);
  const timeEndRef = useRef(null);

  const handleContainerClick = (ref) => {
    if (ref.current) {
      ref.current.showPicker?.();
    }
  };

  const EVENTS_PER_PAGE = 12;
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

    const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, "");

    const words = cleanTitle.split(" ");
    return words
      .filter((word) => word && !excludedWords.includes(word))
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

  // Check if there are any upcoming events
  useEffect(() => {
    const now = new Date();
    const upcomingEvents = events.filter((event) => {
      const eventEndDate = event.date_end
        ? new Date(event.date_end)
        : new Date(event.date_start);
      return eventEndDate >= now;
    });

    setIsEventAvailable(upcomingEvents.length > 0);
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
        time_start: selectedEvent.time_start || "",
        time_end: selectedEvent.time_end || "",
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
      time_start: "",
      time_end: "",
      location: "",
    });
    eventBus.emit("events_updated");
    setNewEventModalOpen(false);
  };

  const paginatedEvents = useMemo(() => {
    const now = new Date();

    const upcomingEvents = events.filter((event) => {
      const endDateTime = new Date(
        `${event.date_end || event.date_start}T${event.time_end || "23:59"}`
      );

      return endDateTime >= now; // Exclude events that have already passed
    });

    const sortedWithDates = upcomingEvents.sort((a, b) => {
      const dateA = new Date(`${a.date_start}T${a.time_start || "00:00"}`);
      const dateB = new Date(`${b.date_start}T${b.time_start || "00:00"}`);
      return dateA - dateB;
    });

    const eventsWithoutDates = events.filter(
      (event) => !event.date_start && !event.date_end
    );

    const allSortedEvents = [...sortedWithDates, ...eventsWithoutDates];

    const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
    const endIndex = startIndex + EVENTS_PER_PAGE;

    return {
      events: allSortedEvents.slice(startIndex, endIndex),
      totalPages: Math.ceil(allSortedEvents.length / EVENTS_PER_PAGE),
      totalEvents: allSortedEvents.length,
    };
  }, [events, currentPage]);

  // Calculate container height based on events per page
  const containerHeight = useMemo(() => {
    const eventsOnCurrentPage = paginatedEvents.events.length;
    if (eventsOnCurrentPage === 0) return "h-0";
    if (eventsOnCurrentPage <= 8) return "h-[274px]";
    return "h-[350px]";
  }, [paginatedEvents.events.length]);

  const getTitleSize = useMemo(() => {
    const eventsOnCurrentPage = paginatedEvents.events.length;
    return eventsOnCurrentPage > 4 ? "text-xl" : "text-2xl";
  }, [paginatedEvents.events.length]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditableEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!selectedEvent) return;

    const updatedEvents = events.map((event) =>
      event.id === selectedEvent.id
        ? {
            ...event,
            ...editableEvent,
            date_start: editableEvent.date_start || null,
            date_end: editableEvent.date_end || null,
            time_start: editableEvent.time_start || null,
            time_end: editableEvent.time_end || null,
          }
        : event
    );

    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    eventBus.emit("events_updated");
    setSelectedEvent(null);
    setEditableEvent({});
  };
  const handleDelete = () => {
    if (!selectedEvent) return;

    const updatedEvents = events.filter(
      (event) => event.id !== selectedEvent.id
    );

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    eventBus.emit("events_updated");

    setSelectedEvent(null);
  };

  const preloadImages = useCallback(async () => {
    const updatedCache = { ...imageCacheRef.current };

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
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      imageCacheRef.current = updatedCache;
      setImageCache(updatedCache);
    }
  }, [events, pixabayApiKey]);

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

  const pastEvents = events.filter((event) => {
    const eventEndDate = event.date_end
      ? new Date(event.date_end)
      : new Date(event.date_start);
    return eventEndDate < new Date();
  });

  const clearTime = (field) => {
    setNewEvent((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const sortedPastEvents = useMemo(() => {
    return isSortedMostRecent
      ? [...pastEvents].sort(
          (a, b) =>
            new Date(b.date_end || b.date_start) -
            new Date(a.date_end || a.date_start)
        )
      : [...pastEvents].sort(
          (a, b) =>
            new Date(a.date_end || a.date_start) -
            new Date(b.date_end || b.date_start)
        );
  }, [isSortedMostRecent, pastEvents]);

  const getTimeRemainingLabel = (event) => {
    const now = new Date();
    const startDateTime = new Date(
      `${event.date_start}T${event.time_start || "00:00"}`
    );

    const timeDifference = startDateTime - now;

    if (timeDifference <= 0) return null; // Event is ongoing or in the past

    const seconds = Math.floor(timeDifference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30); // Approximation for months
    const years = Math.floor(days / 365); // Approximation for years

    if (years > 0) {
      return `in ${years} year${years > 1 ? "s" : ""}`;
    } else if (months > 0) {
      return `in ${months} month${months > 1 ? "s" : ""}`;
    } else if (days > 0) {
      return `in ${days} day${days > 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    } else if (minutes > 0) {
      return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
    }
    return null;
  };

  const PaginationControls = () => {
    if (paginatedEvents.totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center gap-4 mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-slate-800/50 text-cyan-400 border border-cyan-500/30 
                   hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-cyan-400">
          Page {currentPage} of {paginatedEvents.totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) =>
              Math.min(prev + 1, paginatedEvents.totalPages)
            )
          }
          disabled={currentPage === paginatedEvents.totalPages}
          className="p-2 rounded-lg bg-slate-800/50 text-cyan-400 border border-cyan-500/30 
                   hover:bg-slate-700/80 hover:border-cyan-400 transition-all duration-300
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl flex gap-2 items-center">
          <CalendarFold />
          Upcoming Events
        </h1>
        <div className="flex">
          <button
            onClick={() => setPastEventsModalOpen(true)}
            className="flex items-center text-sm overflow-hidden bg-purple-500/20 hover:bg-purple-600/20 duration-300 text-white px-3 rounded-l-md"
          >
            <CalendarFold size={18} />
          </button>
          <button
            onClick={() => setNewEventModalOpen(true)}
            className="flex items-center gap-2 text-sm overflow-hidden bg-blue-500/20 hover:bg-purple-500/20 duration-300 text-white px-3 py-1 rounded-r-md"
          >
            <PlusCircle size={18} />
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
        className={`grid grid-cols-1 ${containerHeight} w-[1240px] rounded-xl md:grid-cols-2 lg:grid-cols-4 gap-6`}
      >
        {paginatedEvents.events.map((event) => {
          const now = new Date();

          const isOngoing = (event) => {
            const startDateTime = new Date(
              `${event.date_start}T${event.time_start || "00:00"}`
            );
            const endDateTime = new Date(
              `${event.date_end || event.date_start}T${
                event.time_end || "23:59"
              }`
            );

            return startDateTime <= now && endDateTime >= now;
          };

          return (
            <button
              key={event.id}
              className="relative w-full max-w-md mx-auto group overflow-hidden 
        rounded-2xl border border-transparent hover:border-cyan-600/50 
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

              {/* Time Remaining Label */}
              {!isOngoing(event) && (
                <div className="absolute top-2 right-2 bg-cyan-600/30 text-cyan-50 px-2 py-1 rounded-md text-xs">
                  {getTimeRemainingLabel(event)}
                </div>
              )}

              {/* Content Container */}
              <div className="relative z-10 p-4 pl-5 text-left text-cyan-50 flex items-center">
                {/* Left Content */}
                <div className="flex-grow pr-4">
                  {/* Event Title */}
                  <h2
                    className={`${getTitleSize} font-orbitron font-bold 
                text-transparent bg-clip-text 
                bg-gradient-to-r from-white to-cyan-200 
                mb-2 tracking-wide`}
                  >
                    {event.title}
                  </h2>

                  {/* Location */}
                  {event.location && (
                    <div className="text-xs text-cyan-300 flex items-center gap-1.5">
                      <MapPin size={12} className="text-cyan-500" />
                      <span title={event.location}>
                        {event.location.length > 27
                          ? `${event.location.slice(0, 27)}...`
                          : event.location}
                      </span>
                    </div>
                  )}

                  {/* Ongoing Badge */}
                  {isOngoing(event) && (
                    <div className="mt-2 text-xs bg-cyan-600/30 text-cyan-200 px-2 py-1 rounded-md inline-block">
                      Ongoing until{" "}
                      <span className="font-bold">
                        {(() => {
                          const endDateTime = new Date(
                            `${event.date_end || event.date_start}T${
                              event.time_end || "23:59"
                            }`
                          );
                          const now = new Date();

                          // Check if the event ends today
                          const isToday =
                            endDateTime.toDateString() === now.toDateString();

                          return isToday
                            ? endDateTime.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hourCycle: "h23", // 24-hour format
                              }) // Format as hh:mm
                            : endDateTime.toLocaleDateString("en-US", {
                                day: "2-digit",
                                month: "short",
                              }); // Format as dd Month
                        })()}
                      </span>
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
          );
        })}
      </div>
      <PaginationControls />

      {/* Past Events Modal */}
      {pastEventsModalOpen && (
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
      )}

      {/* Selected Event Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 rounded-3xl bg-black/70 backdrop-blur-sm"></div>

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
                value={editableEvent.location || ""}
                onChange={handleEditChange}
                placeholder="Event Location"
                className="w-full placeholder:italic text-sm text-cyan-400 text-center bg-transparent border-none outline-none placeholder-gray-400"
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
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
                  name="description"
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
                      {editableEvent.description ? (
                        editableEvent.description
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
                      ) : (
                        <span className="italic text-gray-400">
                          No description
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Date Picker */}
            <div className="flex items-center justify-between text-sm text-gray-300 gap-4">
              {/* Start Date */}
              <div
                className="flex-1 cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
                onClick={() => handleContainerClick(startDateRef)}
              >
                <label className="block mb-1 text-cyan-400 text-sm">
                  Start Date
                </label>
                <input
                  type="date"
                  ref={startDateRef}
                  value={editableEvent.date_start || ""}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setEditableEvent((prev) => ({
                      ...prev,
                      date_start: newStartDate,
                      date_end:
                        newStartDate &&
                        prev.date_end &&
                        new Date(prev.date_end) < new Date(newStartDate)
                          ? newStartDate
                          : prev.date_end,
                    }));
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full bg-transparent text-white outline-none"
                />
              </div>

              {/* End Date */}
              <div
                className="flex-1 cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
                onClick={() => handleContainerClick(endDateRef)}
              >
                <label className="block mb-1 text-cyan-400 text-sm">
                  End Date
                </label>
                <input
                  type="date"
                  ref={endDateRef}
                  value={editableEvent.date_end || ""}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    setEditableEvent((prev) => ({
                      ...prev,
                      date_end: newEndDate,
                      date_start:
                        newEndDate &&
                        new Date(newEndDate) < new Date(prev.date_start)
                          ? newEndDate
                          : prev.date_start,
                    }));
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full bg-transparent text-white outline-none"
                />
              </div>
            </div>

            {/* Time Pickers */}
            <div className="flex gap-4 mt-4">
              {/* Start Time */}
              <div className="flex-1 relative">
                <div
                  className="cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
                  onClick={() => handleContainerClick(timeStartRef)}
                >
                  <label className="block mb-1 text-cyan-400 text-xs">
                    Start Time
                  </label>
                  <input
                    type="time"
                    ref={timeStartRef}
                    name="time_start"
                    value={editableEvent.time_start || ""}
                    onChange={handleEditChange}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
                {editableEvent.time_start && (
                  <button
                    className="absolute top-2 right-2 bg-red-500/50 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-all"
                    onClick={() =>
                      setEditableEvent((prev) => ({ ...prev, time_start: "" }))
                    }
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* End Time */}
              <div className="flex-1 relative">
                <div
                  className="cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
                  onClick={() => handleContainerClick(timeEndRef)}
                >
                  <label className="block mb-1 text-cyan-400 text-xs">
                    End Time
                  </label>
                  <input
                    type="time"
                    ref={timeEndRef}
                    name="time_end"
                    value={editableEvent.time_end || ""}
                    onChange={handleEditChange}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
                {editableEvent.time_end && (
                  <button
                    className="absolute top-2 right-2 bg-red-500/50 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-all"
                    onClick={() =>
                      setEditableEvent((prev) => ({ ...prev, time_end: "" }))
                    }
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              {/^https?:\/\/[\w-]+(\.[\w-]+)+[/#?]?.*$/.test(
                selectedEvent.location
              ) && (
                <a
                  href={selectedEvent.location}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg hover:bg-cyan-500 hover:text-white border border-cyan-500 text-cyan-500 transition-all duration-300 text-center block"
                >
                  <div className="flex text-sm items-center justify-center gap-2">
                    <ExternalLink size={17} />
                    <p>Open Link</p>
                  </div>
                </a>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
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
        </div>
      )}

      {/* New Event Modal */}
      {newEventModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop with cyber effect */}
          <div
            data-tauri-drag-region
            className="absolute rounded-3xl inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div
            data-tauri-drag-region
            className="relative bg-slate-900/20 backdrop-blur-sm rounded-xl p-8 w-full max-w-md border border-cyan-500/30 shadow-2xl shadow-cyan-500/20"
          >
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

              <div className="flex gap-4">
                <div
                  className="flex-1 cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
                  onClick={() => handleContainerClick(startDateRef)}
                >
                  <label className="block mb-1 text-cyan-400 text-xs">
                    Start Date
                  </label>
                  <input
                    type="date"
                    ref={startDateRef}
                    value={newEvent.date_start}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setNewEvent((prev) => ({
                        ...prev,
                        date_start: newStartDate,
                        date_end:
                          newStartDate &&
                          prev.date_end &&
                          new Date(prev.date_end) < new Date(newStartDate)
                            ? newStartDate
                            : prev.date_end,
                      }));
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
                <div
                  className="flex-1 cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
                  onClick={() => handleContainerClick(endDateRef)}
                >
                  <label className="block mb-1 text-cyan-400 text-xs">
                    End Date
                  </label>
                  <input
                    type="date"
                    ref={endDateRef}
                    value={newEvent.date_end}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      setNewEvent((prev) => ({
                        ...prev,
                        date_end: newEndDate,
                        date_start:
                          newEndDate &&
                          new Date(newEndDate) < new Date(prev.date_start)
                            ? newEndDate
                            : prev.date_start,
                      }));
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                {/* Start Time */}
                <div className="flex-1 relative">
                  <div
                    className="cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
                    onClick={() => handleContainerClick(timeStartRef)}
                  >
                    <label className="block mb-1 text-cyan-400 text-xs">
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

                {/* End Time */}
                <div className="flex-1 relative">
                  <div
                    className="cursor-pointer bg-slate-800/50 border border-cyan-500/30 p-2 rounded-lg hover:border-cyan-400 transition-all"
                    onClick={() => handleContainerClick(timeEndRef)}
                  >
                    <label className="block mb-1 text-cyan-400 text-xs">
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
