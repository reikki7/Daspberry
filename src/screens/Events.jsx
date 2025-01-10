import React, { lazy, Suspense } from "react";
import { ScaleLoader } from "react-spinners";
import { useLoadScript } from "@react-google-maps/api";

import EventMap from "../components/local-events/EventMap";
import GoogleCalendarEvents from "../components/google-events/GoogleCalendarEvents";

const LocalEvents = lazy(() =>
  import("../components/local-events/LocalEvents")
);

const libraries = ["places", "marker"];

const Events = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries,
    preventGoogleFontsLoading: true,
  });

  return (
    <div className="flex flex-col">
      <div className="flex gap-4 min-h-[512px] h-full">
        <div className="flex-1">
          <EventMap isLoaded={isLoaded} loadError={loadError} />
        </div>
        <div className={`${isLoaded && "justify-end flex"}`}>
          <GoogleCalendarEvents />
        </div>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center mt-20">
            <ScaleLoader color="#8dccff" />
          </div>
        }
      >
        <LocalEvents isLoaded={isLoaded} />
      </Suspense>
    </div>
  );
};

export default Events;
