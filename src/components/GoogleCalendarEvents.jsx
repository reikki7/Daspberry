import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useAuth } from "../utils/AuthContext";
import { WebviewWindow } from "@tauri-apps/api/window";
import { FaCalendarAlt, FaClock, FaMapMarkerAlt } from "react-icons/fa";
import GoogleLogo from "../assets/g-logo.png";
import { FcGoogle } from "react-icons/fc";
import { RefreshCw } from "lucide-react";
import { ScaleLoader } from "react-spinners";
import GoogleCalendarIcon from "../assets/google-calendar-logo.png";
import eventBus from "../utils/eventBus";

const CACHE_KEY = "cached_events";
const LAST_FETCH_KEY = "last_fetch_timestamp";

const GoogleCalendarEvents = () => {
  const { tokens, setTokens } = useAuth();
  const [authUrl, setAuthUrl] = useState("");
  const [code, setCode] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
          {sortedAndFilteredEvents.map((event, index) => (
            <button
              key={index}
              className="flex flex-col bg-gradient-to-br from-gray-900/40 via-gray-800/45 to-gray-900/40  
          rounded-xl border border-gray-700/50 hover:border-gray-600/50
          shadow-lg hover:shadow-xl transition-all duration-300
          backdrop-blur-sm hover:backdrop-blur-md h-[320px]"
              type="button"
              onClick={() => setSelectedEvent(event)}
            >
              {/* Event Header */}
              <div className="p-4 border-b w-full text-left border-gray-700/50">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="text-lg font-bold text-cyan-300 line-clamp-2">
                    {event.summary}
                  </h3>
                  {event.start && (
                    <span className="text-xs px-2 py-1 bg-gray-800 rounded-full text-gray-300 whitespace-nowrap">
                      {formatEventTime(new Date(event.start))}
                    </span>
                  )}
                </div>
              </div>

              {/* Event Body */}
              <div className="flex-1 p-4 w-full text-left overflow-y-auto">
                <div className="text-sm text-gray-300 mb-2">
                  {event.start && (
                    <div className="mb-1 flex flex-col">
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-purple-200 mr-1" />
                        {new Date(event.start).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        <p className="text-xs text-gray-400">
                          {(() => {
                            const now = new Date();
                            const timeDifference = new Date(event.start) - now;

                            if (timeDifference < 0) return "(event has passed)";

                            const yearsDifference = Math.floor(
                              timeDifference / (1000 * 60 * 60 * 24 * 365.25)
                            );
                            const monthsDifference = Math.floor(
                              timeDifference / (1000 * 60 * 60 * 24 * 30.44)
                            );
                            const daysDifference = Math.floor(
                              timeDifference / (1000 * 60 * 60 * 24)
                            );
                            const hoursDifference = Math.floor(
                              (timeDifference % (1000 * 60 * 60 * 24)) /
                                (1000 * 60 * 60)
                            );
                            const minutesDifference = Math.floor(
                              (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
                            );

                            switch (true) {
                              case yearsDifference > 0:
                                return `(in ${yearsDifference} ${
                                  yearsDifference === 1 ? "year" : "years"
                                })`;
                              case monthsDifference > 0:
                                return `(in ${monthsDifference} ${
                                  monthsDifference === 1 ? "month" : "months"
                                })`;
                              case daysDifference > 14:
                                return `(in ${Math.ceil(
                                  daysDifference / 7
                                )} weeks)`;
                              case daysDifference > 6:
                                return "(next week)";
                              case daysDifference > 1:
                                return `(in ${daysDifference} days)`;
                              case daysDifference === 1:
                                return "(tomorrow)";
                              case hoursDifference > 0:
                                return `(in ${hoursDifference} hours)`;
                              default:
                                return `(in ${minutesDifference} minutes)`;
                            }
                          })()}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <FaClock className="text-purple-200 mr-3" />
                        {new Date(event.start).toLocaleString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(event.end).toLocaleString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  )}
                  {event.description && (
                    <div
                      className="line-clamp-3 text-gray-400 mt-2 "
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  )}
                </div>
              </div>

              {/* Event Footer */}
              <div className="p-4 border-t w-full border-gray-700/50">
                {event.location ? (
                  <a
                    href={event.location}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="w-full flex justify-center items-center px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                text-cyan-400 rounded-lg font-medium
                transition-colors duration-200 hover:text-cyan-300"
                  >
                    Join Meeting
                  </a>
                ) : (
                  <span className="block text-center text-sm text-gray-400">
                    No meeting link
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div
          data-tauri-drag-region
          className="flex items-center mt-40 justify-center"
        >
          <ScaleLoader color="#8dccff" />
        </div>
      )}

      {selectedEvent && (
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
      )}
    </div>
  );
};

export default GoogleCalendarEvents;
