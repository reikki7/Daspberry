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

const SelectedGoogleEventModal = lazy(() =>
  import("./SelectedGoogleEventModal")
);
const GoogleCalendarEventCards = lazy(() =>
  import("./GoogleCalendarEventCards")
);

const CACHE_KEY = "cached_events";
const LAST_FETCH_KEY = "last_fetch_timestamp";

const GoogleCalendarEvents = () => {
  const { tokens, setTokens } = useAuth();
  const [authUrl, setAuthUrl] = useState("");
  const [code, setCode] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

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
    setCode("");
    setIsAuthenticated(true);
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
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error);
      const errorMessage = String(error);
      const isAuthenticating = errorMessage.includes("401");
      if (isAuthenticating) {
        setIsAuthenticated(false);
      }
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
        <div className="flex items-center gap-4 mb-1">
          <img src={GoogleCalendarIcon} alt="Google Calendar" className="w-8" />
          <h2 className="text-2xl text-white">Google Calendar</h2>
        </div>
        <div className="flex items-center rounded-lg overflow-hidden">
          {tokens && (
            <>
              {/* Google Auth Button */}
              <button
                onClick={getAuthUrl}
                className={`flex group rounded-l-lg bg-white items-center gap-2 text-sm ${
                  isAuthenticated ? "saturate-100" : "saturate-0"
                } duration-300 text-white px-3 py-2 `}
              >
                <FcGoogle
                  className="group-hover:-hue-rotate-90 group-hover:-rotate-[25deg] duration-300"
                  size={16}
                />
              </button>

              {/* Refresh Events Button */}
              <button
                onClick={fetchEvents}
                className="flex items-center px-4 py-[7px] group bg-indigo-500/30 hover:bg-indigo-500/50 shadow-md hover:shadow-lg text-sm transition-all duration-300"
              >
                <RefreshCw
                  size={16}
                  className="mr-2 -mt-0.5 duration-300 group-hover:rotate-180"
                />
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="flex flex-col gap-4 justify-center items-center">
          {/* Login with Google Button */}
          {!tokens && (
            <button
              onClick={getAuthUrl}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 via-cyan-500/30 to-green-600/40 text-cyan-100 rounded-lg text-sm font-semibold shadow-md hover:from-blue-500/40 hover:to-green-600/50 hover:shadow-lg transition-all duration-300"
            >
              <img
                src={GoogleLogo}
                alt="Google logo"
                className="w-5 h-5 mr-3"
              />
              Login with Google
            </button>
          )}

          {/* Submit Code Input and Button */}
          {authUrl && (
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                placeholder="Enter code"
                className="w-[565px] px-4 py-2 bg-gray-950/40 text-white border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none placeholder-gray-400 transition-all duration-300"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <button
                className="px-5 py-2.5 bg-gray-950/40 text-white font-semibold text-sm rounded-lg hover:bg-gray-950/60 shadow-md hover:shadow-lg transition-all duration-300"
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
