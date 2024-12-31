import React, { useEffect, useState, useRef } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { invoke } from "@tauri-apps/api/tauri";
import eventBus from "../../utils/eventBus";
import GoogleCalendarEvents from "../google-events/GoogleCalendarEvents";

const libraries = ["places"];

const EventMap = ({ setIsMapExisting }) => {
  const [events, setEvents] = useState([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries,
  });

  useEffect(() => {
    const loadEvents = async () => {
      const loadedEvents = await invoke("load_local_events");
      const validEvents = loadedEvents.filter(
        (event) =>
          typeof event.latitude === "number" &&
          typeof event.longitude === "number"
      );

      const now = new Date();
      const upcomingEvents = validEvents.filter((event) => {
        if (!event.date_end && !event.date_start) {
          return true; // Include events with no dates
        }

        const endDateStr = event.date_end || event.date_start;
        const endTimeStr = event.time_end || "23:59";
        const endDateTime = new Date(`${endDateStr}T${endTimeStr}`);
        return endDateTime >= now;
      });

      setEvents(upcomingEvents);
    };

    loadEvents();

    const handleUpdate = () => {
      loadEvents();
    };

    eventBus.on("events_updated", handleUpdate);

    return () => {
      eventBus.off("events_updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (isMapLoaded && events.length > 0) {
      if (events.length === 1) {
        const event = events[0];
        mapRef.current?.setCenter({
          lat: event.latitude,
          lng: event.longitude,
        });
        mapRef.current?.setZoom(17);
      } else {
        const bounds = new window.google.maps.LatLngBounds();
        events.forEach((event) => {
          bounds.extend(
            new window.google.maps.LatLng(event.latitude, event.longitude)
          );
        });
        mapRef.current?.fitBounds(bounds);
      }
    } else if (isMapLoaded && events.length === 0) {
      mapRef.current?.setZoom(12);
    }
  }, [isMapLoaded, events]);

  const handleMapLoad = (map) => {
    setIsMapLoaded(true);
    setIsMapExisting(true);
    mapRef.current = map;
  };

  const handleMapUnmount = () => {
    setIsMapLoaded(false);
    setIsMapExisting(false);
    mapRef.current = null;
  };

  const mapStyles = {
    width: "100%",
    height: "500px",
  };

  if (loadError) {
    return <div>Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading Google Maps...</div>;
  }

  return (
    <div className="mb-3 gap-4 flex">
      <GoogleMap
        mapContainerStyle={mapStyles}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        zoom={12} // Default zoom level
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            position={{ lat: event.latitude, lng: event.longitude }}
            title={event.title}
          />
        ))}
      </GoogleMap>
      <div className="w-1/5">
        <GoogleCalendarEvents />
      </div>
    </div>
  );
};

export default EventMap;
