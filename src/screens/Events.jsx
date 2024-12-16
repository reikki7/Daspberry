import React from "react";
import GoogleCalendarEvents from "../components/GoogleCalendarEvents";
import LocalEvents from "../components/LocalEvents";
const Events = () => {
  return (
    <div>
      <div>
        <LocalEvents />
      </div>
      <div className="mt-4">
        <GoogleCalendarEvents />
      </div>
    </div>
  );
};

export default Events;
