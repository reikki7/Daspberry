import React, { lazy, Suspense } from "react";

const LocalEvents = lazy(() =>
  import("../components/local-events/LocalEvents")
);
const Events = () => {
  return (
    <div className="flex flex-col gap-6">
      <Suspense>
        <LocalEvents />
      </Suspense>
    </div>
  );
};

export default Events;
