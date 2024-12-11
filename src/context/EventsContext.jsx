import React, { createContext, useContext, useState } from "react";

const EventsContext = createContext();

export const useEvents = () => useContext(EventsContext);

export const EventsProvider = ({ children }) => {
  const [events, setEvents] = useState([]);

  const loadCachedEvents = async () => {
    const cachedEvents =
      JSON.parse(localStorage.getItem("cached_events")) || [];
    setEvents(cachedEvents);
  };

  return (
    <EventsContext.Provider value={{ events, setEvents, loadCachedEvents }}>
      {children}
    </EventsContext.Provider>
  );
};
