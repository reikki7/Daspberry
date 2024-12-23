import React, { lazy, Suspense } from "react";

const LocalEvents = lazy(() => import("../components/events/LocalEvents"));
const GoogleCalendarEvents = lazy(() =>
  import("../components/events/GoogleCalendarEvents")
);

const Events = () => {
  return (
    <div className="flex flex-col gap-6">
      <Suspense>
        <LocalEvents />
        <GoogleCalendarEvents />
      </Suspense>
    </div>
  );
};

export default Events;
