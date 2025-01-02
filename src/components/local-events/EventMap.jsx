import React, { useEffect, useState, useRef } from "react";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import { invoke } from "@tauri-apps/api/tauri";
import eventBus from "../../utils/eventBus";
import GoogleCalendarEvents from "../google-events/GoogleCalendarEvents";

const EventMap = ({ setIsMapExisting, isLoaded, loadError }) => {
  const [events, setEvents] = useState([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    const loadEvents = async () => {
      const loadedEvents = await invoke("load_local_events");
      const validEvents = loadedEvents.filter(
        (event) =>
          typeof event.latitude === "number" &&
          typeof event.longitude === "number" &&
          !isNaN(event.latitude) &&
          !isNaN(event.longitude) &&
          event.latitude >= -90 &&
          event.latitude <= 90 &&
          event.longitude >= -180 &&
          event.longitude <= 180
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
      markersRef.current.forEach((marker) => (marker.map = null));
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (isMapLoaded && events.length > 0) {
      // Clear existing markers
      markersRef.current.forEach((marker) => (marker.map = null));
      markersRef.current = [];

      try {
        // Create new markers
        const markers = events.map((event) => {
          const marker = new window.google.maps.marker.AdvancedMarkerElement({
            map: mapRef.current,
            position: { lat: event.latitude, lng: event.longitude },
            title: event.title,
          });
          return marker;
        });
        markersRef.current = markers;

        if (events.length === 1) {
          const event = events[0];
          mapRef.current?.setCenter({
            lat: event.latitude,
            lng: event.longitude,
          });
          mapRef.current?.setZoom(17);
        } else {
          const bounds = new window.google.maps.LatLngBounds();
          let hasValidBounds = false;

          events.forEach((event) => {
            if (
              event.latitude &&
              event.longitude &&
              !isNaN(event.latitude) &&
              !isNaN(event.longitude)
            ) {
              bounds.extend({
                lat: event.latitude,
                lng: event.longitude,
              });
              hasValidBounds = true;
            }
          });

          if (hasValidBounds && mapRef.current) {
            mapRef.current.fitBounds(bounds);

            // Add a small padding to the bounds
            const padding = { top: 50, right: 50, bottom: 50, left: 50 };
            mapRef.current.panToBounds(bounds, padding);
          }
        }
      } catch (error) {
        console.error("Error updating map markers:", error);
      }
    } else if (isMapLoaded && events.length === 0) {
      markersRef.current.forEach((marker) => (marker.map = null));
      markersRef.current = [];
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
    markersRef.current.forEach((marker) => (marker.map = null));
    markersRef.current = [];
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
        zoom={11}
        options={{
          mapId: import.meta.env.VITE_GOOGLE_MAPS_ID,
        }}
      />
      <div className="w-1/5">
        <GoogleCalendarEvents />
      </div>
    </div>
  );
};

export default EventMap;
