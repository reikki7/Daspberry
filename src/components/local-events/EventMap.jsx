import React, { useEffect, useState, useRef } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { invoke } from "@tauri-apps/api/tauri";
import eventBus from "../../utils/eventBus";
import { ScaleLoader } from "react-spinners";
import { RefreshCw } from "lucide-react";

const EventMap = ({ isLoaded, loadError }) => {
  const [events, setEvents] = useState([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const defaultCenter = { lat: -6.2088, lng: 106.8456 };

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
    mapRef.current = map;
    setTimeout(() => setIsMapLoaded(true), 0);
  };

  const handleMapUnmount = () => {
    setIsMapLoaded(false);
    markersRef.current.forEach((marker) => (marker.map = null));
    markersRef.current = [];
    mapRef.current = null;
  };

  const mapStyles = {
    width: "100%",
    height: "500px",
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[500px] bg-black/70 border border-white/10 rounded-3xl shadow-2xl p-6">
        <div className="text-white/80 text-lg font-semibold mb-4">
          Oops! Google Maps failed to load.
        </div>
        <div className="text-white/60 text-sm mb-6">
          Please check your internet connection or try refreshing the map.
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-white/10 px-6 py-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        data-tauri-drag-region
        className="absolute inset-0 flex items-center justify-center z-50"
      >
        <ScaleLoader color="#8dccff" />
      </div>
    );
  }

  return (
    <div className="mb-3 gap-4 flex">
      <GoogleMap
        mapContainerStyle={mapStyles}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        zoom={11}
        center={events.length > 0 ? undefined : defaultCenter}
        options={{
          mapId: import.meta.env.VITE_GOOGLE_MAPS_ID,
          disableDefaultUI: true,
          streetViewControl: true,
          streetViewControlOptions: {
            position: window.google.maps.ControlPosition.TOP_RIGHT,
          },
        }}
      />
    </div>
  );
};

export default EventMap;
