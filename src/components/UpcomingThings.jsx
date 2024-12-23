import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import eventBus from "../utils/eventBus";

const UpcomingThings = () => {
  const [firstCard, setFirstCard] = useState(null);
  const [secondCard, setSecondCard] = useState(null);

  const loadUpcomingThings = async () => {
    try {
      const loadedLocalTasks = await invoke("load_local_tasks");
      let loadedAsanaTasks = await invoke("read_asana_tasks_cache");
      const loadedLocalEvents = await invoke("load_local_events");
      const loadedGoogleEvents =
        JSON.parse(localStorage.getItem("cached_events")) || [];

      try {
        loadedAsanaTasks = JSON.parse(loadedAsanaTasks);
      } catch (error) {
        console.error("Failed to parse Asana tasks:", error);
        loadedAsanaTasks = [];
      }

      const allTasks = [
        ...(loadedLocalTasks?.map((task) => ({
          summary: task.title,
          date: new Date(task.date),
          type: "local_task",
          completed: task.completed,
        })) || []),
        ...(loadedAsanaTasks?.map((task) => ({
          summary: task.name,
          date: new Date(task.due_on),
          type: "asana_task",
          completed: task.completed,
        })) || []),
      ];

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

      const sortedTasks = allTasks
        .filter((task) => task.date > new Date() && !task.completed)
        .sort((a, b) => a.date - b.date);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const sortedEvents = allEvents
        .filter((event) => event.date >= startOfToday)
        .sort((a, b) => a.date - b.date);

      if (sortedEvents.length > 0 && sortedTasks.length > 0) {
        setFirstCard(sortedEvents[0]);
        setSecondCard(sortedTasks[0]);
      } else if (sortedEvents.length > 1) {
        setFirstCard(sortedEvents[0]);
        setSecondCard(sortedEvents[1]);
      } else if (sortedTasks.length > 1) {
        setFirstCard(sortedTasks[0]);
        setSecondCard(sortedTasks[1]);
      } else {
        setFirstCard(
          sortedEvents[0] || {
            summary: "No upcoming event",
            date: null,
            type: "local_event",
          }
        );
        setSecondCard(
          sortedTasks[0] || {
            summary: "No upcoming deadline",
            date: null,
            type: "local_task",
          }
        );
      }
    } catch (error) {
      console.error("Error loading upcoming things:", error);
    }
  };

  useEffect(() => {
    loadUpcomingThings();

    const handleUpdate = () => {
      loadUpcomingThings();
    };

    eventBus.on("events_updated", handleUpdate);
    eventBus.on("tasks_updated", handleUpdate);

    return () => {
      eventBus.off("events_updated", handleUpdate);
      eventBus.off("tasks_updated", handleUpdate);
    };
  }, []);

  const formatDate = (date) => {
    return date
      ? date.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "";
  };

  const getTitle = (card) => {
    if (!card?.date) return "Upcoming Event";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (card.date.toDateString() === today.toDateString()) {
      return card.type.includes("event") ? "Today's Event" : "Deadline Today";
    }

    return card.type.includes("event") ? "Upcoming Event" : "Upcoming Deadline";
  };

  return (
    <div
      className="mt-2 relative pr-3 flex flex-col"
      style={{ userSelect: "none" }}
    >
      {[firstCard, secondCard].map((card, index) => {
        const isEvent = card?.type?.includes("event");
        const color = isEvent ? "text-cyan-300" : "text-pink-300";
        const isPlaceholder = card?.summary?.includes("No upcoming");

        return (
          <div
            key={index}
            className={`${
              index === 1 ? "ml-24" : "ml-40"
            } group mt-2 p-3 rounded-lg border border-gray-700/40 shadow-md transition-all duration-300 max-w-[325px] ${
              isEvent ? "hover:shadow-cyan-400/30" : "hover:shadow-pink-400/30"
            }`}
          >
            <div className={`text-[9px] ${color} uppercase tracking-widest`}>
              {getTitle(card)}
              {card?.date && !isPlaceholder && (
                <span className="text-[9px] text-gray-200 mt-1">
                  {" — " + formatDate(new Date(card.date))}
                </span>
              )}
            </div>
            <div
              className={`text-sm mt-1 font-medium ${
                isPlaceholder ? "text-gray-400 italic" : "text-white"
              }`}
            >
              {card?.summary || "No upcoming event"}
            </div>
            <div
              className={`absolute rotate-12 opacity-50 text-xl ${color} ${
                index === 0 ? "top-0 right-3" : "top-[72px] right-[72px]"
              } group-hover:animate-pulse`}
            >
              {isEvent ? "運" : "任"}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UpcomingThings;
