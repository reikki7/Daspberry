import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useAuth } from "../../utils/AuthContext";
import { WebviewWindow } from "@tauri-apps/api/window";
import { FaCalendarAlt, FaClock, FaMapMarkerAlt } from "react-icons/fa";
import GoogleLogo from "../../assets/g-logo.png";
import { FcGoogle } from "react-icons/fc";
import { RefreshCw } from "lucide-react";
import { ScaleLoader } from "react-spinners";
import GoogleCalendarIcon from "../../assets/google-calendar-logo.png";
import eventBus from "../../utils/eventBus";

const CACHE_KEY = "cached_events";
const LAST_FETCH_KEY = "last_fetch_timestamp";

const GoogleCalendarEvents = () => {
  const { tokens, setTokens } = useAuth();
  const [authUrl, setAuthUrl] = useState("");
  const [code, setCode] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);

  const SelectedGoogleEventModal = lazy(() =>
    import("./SelectedGoogleEventModal")
  );
  const GoogleCalendarEventCards = lazy(() =>
    import("./GoogleCalendarEventCards")
  );

  // Load events from localStorage on component mount
  useEffect(() => {
    const cachedEvents = JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
    setEvents(cachedEvents);

    const lastFetch = localStorage.getItem(LAST_FETCH_KEY);
    const now = Date.now();

    if (!lastFetch || now - parseInt(lastFetch) > 12 * 60 * 60 * 1000) {
      fetchEvents();
    }

    const interval = setInterval(fetchEvents, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tokens]);

  const getAuthUrl = async () => {
    const url = await invoke("get_google_auth_url");

    const authWindow = new WebviewWindow("auth", {
      title: "Google Authentication",
      width: 500,
      height: 700,
      url,
      resizable: false,
    });
    setAuthUrl(url);
    authWindow.show();
  };

  const getAccessToken = async () => {
    const tokenData = await invoke("get_google_tokens", { code });
    setTokens(tokenData);
    localStorage.setItem("refreshToken", tokenData.refresh_token);
    setAuthUrl("");
  };

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const newTokenData = await invoke("refresh_google_tokens", {
        refreshToken,
      });
      setTokens(newTokenData);
      localStorage.setItem("authTokens", JSON.stringify(newTokenData));
    } catch (error) {
      console.error("Failed to refresh access token:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const tokens = JSON.parse(localStorage.getItem("authTokens"));
      if (tokens && tokens.expiry_date && Date.now() > tokens.expiry_date) {
        await refreshAccessToken();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Load events from localStorage on component mount
  useEffect(() => {
    const cachedEvents = JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
    setEvents(cachedEvents);

    const lastFetch = localStorage.getItem(LAST_FETCH_KEY);
    const now = Date.now();

    if (!lastFetch || now - parseInt(lastFetch) > 12 * 60 * 60 * 1000) {
      fetchEvents();
    }

    const interval = setInterval(fetchEvents, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    if (!tokens?.access_token) return;

    setLoading(true);
    try {
      const fetchedEvents = await invoke("fetch_google_calendar_events", {
        accessToken: tokens?.access_token,
      });
      setEvents(fetchedEvents);
      localStorage.setItem(CACHE_KEY, JSON.stringify(fetchedEvents));
      localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
      eventBus.emit("events_updated");
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (date) => {
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (diffDays > 0) {
      return `in ${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      return `in ${diffHours}h`;
    } else {
      return "Soon";
    }
  };

  const sortedAndFilteredEvents = useMemo(() => {
    const now = new Date();
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );

    // Find the closest "Weekly Huddle" event to the current time
    const weeklyHuddles = sortedEvents.filter(
      (event) =>
        event.summary === "Weekly Huddle" && new Date(event.start) > now
    );

    const closestWeeklyHuddle =
      weeklyHuddles.length > 0
        ? weeklyHuddles.reduce((closest, current) =>
            new Date(current.start) < new Date(closest.start)
              ? current
              : closest
          )
        : null;

    // Filter all other events, including only the closest "Weekly Huddle"
    const filteredEvents = sortedEvents.filter(
      (event) =>
        event.summary !== "Weekly Huddle" ||
        (closestWeeklyHuddle && event === closestWeeklyHuddle)
    );

    return filteredEvents.filter((event) => new Date(event.start) > now);
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3 mb-1">
          <img src={GoogleCalendarIcon} alt="Google Calendar" className="w-8" />
          <h2 className="text-xl font-bold text-white">Google Calendar</h2>
        </div>
        <div className="flex items-center justify-between">
          {tokens && (
            <div className="flex items-center">
              <button
                onClick={getAuthUrl}
                className="flex items-center gap-2 text-sm bg-pink-300/20 hover:bg-pink-300/40 duration-300 text-white px-3 py-2 rounded-l-md"
              >
                <FcGoogle size={16} />
              </button>

              <button
                onClick={fetchEvents}
                className="flex items-center gap-2 text-sm hover:bg-blue-500/40 duration-300 bg-blue-500/20 text-white px-3 py-1.5 rounded-r-md"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-center">
        <div className="flex flex-col gap-2 justify-center">
          {!tokens && (
            <button
              className="px-[87px] py-2 bg-white justify-center duration-150 border text-gray-700 rounded shadow hover:bg-gray-100 flex items-center"
              onClick={getAuthUrl}
            >
              <img
                src={GoogleLogo}
                alt="Google logo"
                className="w-5 h-5 mr-2"
              />
              <p>Login with Google</p>
            </button>
          )}
          {authUrl && (
            <div className="flex items-center gap-1 justify-center">
              <input
                type="text"
                placeholder="Enter code"
                className="max-w-md px-4 py-2 bg-gray-900/50 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
              />
              <button
                className="px-4 py-[10px] bg-gradient-to-r from-teal-500/40 via-blue-500/30 to-green-600/40 text-white rounded-lg text-sm font-semibold duration-150 transition hover:shadow-lg"
                onClick={getAccessToken}
              >
                Submit Code
              </button>
            </div>
          )}
        </div>
      </div>

      {!loading ? (
        <Suspense fallback={null}>
          <GoogleCalendarEventCards
            sortedAndFilteredEvents={sortedAndFilteredEvents}
            setSelectedEvent={setSelectedEvent}
            formatEventTime={formatEventTime}
          />
        </Suspense>
      ) : (
        <div
          data-tauri-drag-region
          className="flex items-center mt-40 justify-center"
        >
          <ScaleLoader color="#8dccff" />
        </div>
      )}

      {selectedEvent && (
        <Suspense fallback={null}>
          <SelectedGoogleEventModal
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            formatEventTime={formatEventTime}
          />
        </Suspense>
      )}
    </div>
  );
};

export default GoogleCalendarEvents;
