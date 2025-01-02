import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  lazy,
  Suspense,
} from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { syncLocalEventsWithFirestore } from "../../utils/syncLocalEvents";
import { db } from "../../config/firebase";
import { useLoadScript } from "@react-google-maps/api";
import { PlusCircle, CalendarFold } from "lucide-react";
import { ScaleLoader } from "react-spinners";
import FallbackImage from "../../assets/fallback-image-events.jpg";
import eventBus from "../../utils/eventBus";
import EventMap from "./EventMap";

const LocalEventCards = lazy(() => import("./LocalEventCards"));
const LocalMapEventCards = lazy(() => import("./LocalMapEventCards"));
const LocalPastEventModal = lazy(() => import("./LocalPastEventModal"));
const SelectedLocalEventModal = lazy(() => import("./SelectedLocalEventModal"));
const NewLocalEventModal = lazy(() => import("./NewLocalEventModal"));
const PaginationControls = lazy(() => import("./PaginationControls"));

const libraries = ["places", "marker"];

const LocalEvents = () => {
  const [events, setEvents] = useState([]);
  const [newEventModalOpen, setNewEventModalOpen] = useState(false);
  const [imageCache, setImageCache] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editableEvent, setEditableEvent] = useState({});
  const [isEventAvailable, setIsEventAvailable] = useState(false);
  const [pastEventsModalOpen, setPastEventsModalOpen] = useState(false);
  const [isMapExisting, setIsMapExisting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries,
    preventGoogleFontsLoading: true,
  });

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
    import("./LocalPastEventModal");
    import("./SelectedLocalEventModal");
    import("./NewLocalEventModal");
  }, []);

  // 3) Sync whenever user goes back online
  useEffect(() => {
    async function handleOnline() {
      await syncLocalEventsWithFirestore(events, setEvents, saveEvents);
    }

    if (navigator.onLine) {
      handleOnline();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
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

  const paginatedEvents = useMemo(() => {
    const now = new Date();

    const upcomingEvents = events.filter((event) => {
      const endDateTime = new Date(
        `${event.date_end || event.date_start}T${event.time_end || "23:59"}`
      );

      // Exclude events that have already passed
      return endDateTime >= now;
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
        if (data.hits?.length > 0) {
          return data.hits[0].fullHDURL || data.hits[0].largeImageURL;
        }
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

  const getTimeRemainingLabel = (event) => {
    const now = new Date();
    const startDateTime = new Date(
      `${event.date_start}T${event.time_start || "00:00"}`
    );

    const timeDifference = startDateTime - now;

    // Event is ongoing or in the past
    if (timeDifference <= 0) return null;

    const seconds = Math.floor(timeDifference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

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

  return (
    <div>
      <EventMap
        setIsMapExisting={setIsMapExisting}
        isLoaded={isLoaded}
        loadError={loadError}
      />
      <div>
        <div className="flex justify-between mb-3">
          <h1 className="text-xl flex gap-4 items-center">
            <CalendarFold />
            Upcoming Events
          </h1>
          <div className="flex rounded-lg overflow-hidden">
            <button
              onClick={() => setPastEventsModalOpen(true)}
              className="flex items-center justify-center px-3 py-1 text-sm font-medium bg-purple-500/30 hover:bg-purple-500/40 text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              <CalendarFold size={16} />
            </button>

            {/* Add Event Button */}
            <button
              onClick={() => setNewEventModalOpen(true)}
              className="flex items-center justify-center px-3 py-1 text-sm font-medium bg-blue-500/40 text-white hover:bg-blue-500/50 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <PlusCircle size={16} />
              <span className="ml-2 hidden sm:inline mt-0.5">Add Event</span>
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
        <Suspense
          fallback={
            <div className="flex items-center justify-center mt-20">
              <ScaleLoader color="#8dccff" />
            </div>
          }
        >
          {/* Events Cards */}
          {isMapExisting ? (
            <LocalMapEventCards
              paginatedEvents={paginatedEvents}
              setSelectedEvent={setSelectedEvent}
              imageCache={imageCache}
              getTitleSize={getTitleSize}
              getTimeRemainingLabel={getTimeRemainingLabel}
            />
          ) : (
            <LocalEventCards
              paginatedEvents={paginatedEvents}
              setSelectedEvent={setSelectedEvent}
              imageCache={imageCache}
              containerHeight={containerHeight}
              getTitleSize={getTitleSize}
              getTimeRemainingLabel={getTimeRemainingLabel}
            />
          )}

          <PaginationControls
            paginatedEvents={paginatedEvents}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />

          {/* Past Events Modal */}
          {pastEventsModalOpen && (
            <LocalPastEventModal
              setPastEventsModalOpen={setPastEventsModalOpen}
              setSelectedEvent={setSelectedEvent}
              events={events}
            />
          )}

          {/* Selected Event Modal */}
          {selectedEvent && (
            <SelectedLocalEventModal
              selectedEvent={selectedEvent}
              setEditableEvent={setEditableEvent}
              editableEvent={editableEvent}
              setSelectedEvent={setSelectedEvent}
              saveEvents={saveEvents}
              setEvents={setEvents}
              events={events}
              isLoaded={isLoaded}
            />
          )}

          {/* New Event Modal */}
          {newEventModalOpen && (
            <NewLocalEventModal
              setNewEventModalOpen={setNewEventModalOpen}
              handleContainerClick={handleContainerClick}
              saveEvents={saveEvents}
              setEvents={setEvents}
              events={events}
              isLoaded={isLoaded}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default LocalEvents;
