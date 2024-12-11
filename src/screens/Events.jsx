import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useAuth } from "../utils/AuthContext";
import { WebviewWindow } from "@tauri-apps/api/window";
import { FaCalendarAlt, FaClock } from "react-icons/fa";
import GoogleLogo from "../assets/g-logo.png";
import { RefreshCw } from "lucide-react";
import { ScaleLoader } from "react-spinners";
import GoogleCalendarIcon from "../assets/google-calendar-logo.png";

const CACHE_KEY = "cached_events";
const LAST_FETCH_KEY = "last_fetch_timestamp";

const Events = () => {
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
      url, // The Google OAuth URL
      resizable: false,
    });
    setAuthUrl(url);
    authWindow.show();
  };

  const getAccessToken = async () => {
    const tokenData = await invoke("get_google_tokens", { code });
    setTokens(tokenData);
    setAuthUrl("");
  };

  // Load events from localStorage on component mount
  useEffect(() => {
    const cachedEvents = JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
    setEvents(cachedEvents);

    const lastFetch = localStorage.getItem(LAST_FETCH_KEY);
    const now = Date.now();

    // Auto-fetch if the last fetch was more than 12 hours ago
    if (!lastFetch || now - parseInt(lastFetch) > 12 * 60 * 60 * 1000) {
      fetchEvents();
    }

    // Set up automatic refresh every 12 hours
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
    // Sort events by start time
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
            <button
              onClick={fetchEvents}
              className="flex items-center gap-2 text-sm bg-blue-500/20 text-white px-3 py-1 rounded"
            >
              <RefreshCw size={14} /> Refresh
            </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div
            className="backdrop-blur-lg bg-gradient-to-br duration-200 from-indigo-900/20 via-blue-800/20 to-purple-900/20 
       border border-indigo-700/50 hover:border-indigo-600/60
        rounded-xl shadow-2xl w-11/12 max-w-lg p-8 text-white"
          >
            <h2 className="text-2xl font-extrabold text-white mb-5">
              {selectedEvent.summary}
            </h2>
            {selectedEvent.start && (
              <div className="flex items-center justify-between text-md mb-4">
                <div className="flex items-center gap-2">
                  <p className="flex items-center gap-2">
                    <FaCalendarAlt className="mr-2 text-purple-300" />
                    {new Date(selectedEvent.start).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(() => {
                      const currentDate = new Date();
                      const eventDate = new Date(selectedEvent.start);
                      const timeDifference = eventDate - currentDate;
                      const daysDifference = Math.ceil(
                        timeDifference / (1000 * 60 * 60 * 24)
                      );

                      if (daysDifference === 1) {
                        return "(tomorrow)";
                      } else if (daysDifference <= 6) {
                        return `(in ${daysDifference} days)`;
                      } else if (daysDifference <= 14) {
                        return "(next week)";
                      } else {
                        return `(in ${Math.ceil(daysDifference / 7)} weeks)`;
                      }
                    })()}
                  </p>
                </div>
                <p className="flex items-center gap-2">
                  <FaClock className="ml-4 mr-2 text-purple-300" />
                  {new Date(selectedEvent.start).toLocaleString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {new Date(selectedEvent.end).toLocaleString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            {selectedEvent.description && (
              <div
                className="text-gray-300 text-sm mb-4 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: selectedEvent.description,
                }}
              />
            )}
            {selectedEvent.location && (
              <a
                href={selectedEvent.location}
                className="text-gray-400 italic mb-4 hover:text-gray-200 duration-200"
              >
                {selectedEvent.location}
              </a>
            )}
            <button
              className="w-full mt-4 px-5 py-3 bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white rounded-lg 
        font-semibold text-lg shadow-md hover:shadow-lg hover:opacity-80 transition duration-200"
              onClick={() => setSelectedEvent(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
