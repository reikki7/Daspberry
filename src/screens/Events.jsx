import React, { lazy, Suspense } from "react";
import { ScaleLoader } from "react-spinners";

const LocalEvents = lazy(() =>
  import("../components/local-events/LocalEvents")
);
const Events = () => {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center mt-20">
            <ScaleLoader color="#8dccff" />
          </div>
        }
      >
        <LocalEvents />
      </Suspense>
    </div>
  );
};

export default Events;
