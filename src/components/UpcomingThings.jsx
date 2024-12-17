import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import eventBus from "../utils/eventBus";

const UpcomingThings = () => {
  const [upcomingEvent, setUpcomingEvent] = useState(null);
  const [upcomingTask, setUpcomingTask] = useState(null);

  const loadUpcomingThings = async () => {
    try {
      const loadedLocalTasks = await invoke("load_local_tasks");
      let loadedAsanaTasks = await invoke("read_asana_tasks_cache");
      const loadedLocalEvents = await invoke("load_local_events");
      const loadedGoogleEvents =
        JSON.parse(localStorage.getItem("cached_events")) || [];

      // Safely parse Asana tasks
      try {
        loadedAsanaTasks = JSON.parse(loadedAsanaTasks);
      } catch (error) {
        console.error("Failed to parse Asana tasks:", error);
        loadedAsanaTasks = [];
      }

      // Combine all tasks
      const allTasks = [
        ...(loadedLocalTasks?.map((task) => ({
          summary: task.title,
          date: new Date(task.date),
          type: "local_task",
        })) || []),
        ...(loadedAsanaTasks?.map((task) => ({
          summary: task.name,
          date: new Date(task.due_on),
          type: "asana_task",
        })) || []),
      ];

      // Combine all events
      const allEvents = [
        ...(loadedLocalEvents?.map((event) => ({
          summary: event.title,
          date: new Date(event.date_start),
          type: "local_event",
        })) || []),
        ...(loadedGoogleEvents
          ?.filter((event) => event.summary !== "Weekly Huddle")
          .map((event) => ({
            summary: event.summary,
            date: new Date(event.start),
            type: "google_event",
          })) || []),
      ];

      // Sort and filter upcoming tasks and events
      const sortedTasks = allTasks
        .filter((task) => task.date > new Date())
        .sort((a, b) => a.date - b.date);

      const sortedEvents = allEvents
        .filter((event) => event.date > new Date())
        .sort((a, b) => a.date - b.date);

      // Set state with the nearest task and event
      setUpcomingTask(sortedTasks[0] || null);
      setUpcomingEvent(sortedEvents[0] || null);
    } catch (error) {
      console.error("Error loading upcoming things:", error);
    }
  };

  useEffect(() => {
    // Initial load
    loadUpcomingThings();

    // Listen for 'events_updated' and 'tasks_updated'
    const handleUpdate = () => {
      console.log("UpcomingThings: Reloading data due to event or task update");
      loadUpcomingThings();
    };

    eventBus.on("events_updated", handleUpdate);
    eventBus.on("tasks_updated", handleUpdate);

    // Cleanup listener on unmount
    return () => {
      eventBus.off("events_updated", handleUpdate);
      eventBus.off("tasks_updated", handleUpdate);
    };
  }, []);

  return (
    <div
      className="mt-2 relative pr-3 flex flex-col"
      style={{ userSelect: "none" }}
    >
      {/* Upcoming Event */}
      {upcomingEvent && (
        <div className="relative ml-40 group mt-2 p-3 rounded-lg border border-gray-700/40 shadow-md hover:shadow-cyan-500/30 transition-all duration-300 max-w-[305px]">
          <div className="text-[9px] text-cyan-300 uppercase tracking-widest">
            Upcoming Event
            <span className="text-[9px] text-gray-200 mt-1">
              {" "}
              —{" "}
              {upcomingEvent.date.toLocaleDateString("en-US", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="text-sm text-white mt-1 font-medium">
            {upcomingEvent.summary}
          </div>
          <div className="absolute rotate-12 -top-1 -right-1 opacity-50 text-xl text-cyan-400 group-hover:animate-pulse">
            運
          </div>
        </div>
      )}

      {/* Upcoming Task */}
      {upcomingTask && (
        <div className="relative ml-24 group mt-2 p-3 rounded-lg border border-gray-700/40 shadow-md hover:shadow-pink-500/30 transition-all duration-300 max-w-[305px]">
          <div className="text-[9px] text-pink-300 uppercase tracking-widest">
            Upcoming Deadline
            <span className="text-[9px] text-gray-200 mt-1">
              {" "}
              —{" "}
              {upcomingTask.date.toLocaleDateString("en-US", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="text-sm text-white mt-1 font-medium">
            {upcomingTask.summary}
          </div>
          <div className="absolute rotate-12 -top-2 -right-2 opacity-50 text-xl text-pink-300 group-hover:animate-pulse">
            任
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingThings;
