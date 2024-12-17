import React, { useEffect, useState } from "react";
import axios from "axios";
import MiniCalendar from "../components/MiniCalendar";
import MusicPlayer from "../components/MusicPlayer";
import ProjectWheel from "../components/ProjectWheel";
import UpcomingThings from "../components/UpcomingThings";

import eventBus from "../utils/eventBus";

const Clock = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({});

  const weatherApiKey = import.meta.env.VITE_WEATHER_API_KEY;
  const weatherLocation = "Bandung";

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await axios.get(
          `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${weatherLocation}&aqi=no`
        );
        const weatherData = {
          icon: response.data.current.condition.icon,
        };
        setWeather(weatherData);
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };

    fetchWeather();
  }, []);

  return (
    <div className="relative group select-none">
      <div className="absolute -inset-1 rounded-2xl opacity-0 duration-500" />
      <div
        className="relative flex flex-col items-center h-36 bg-blue-950/30 mt-1 rounded-2xl px-12 py-2 pb-9 shadow-2xl"
        style={{
          clipPath:
            "path('M 0 0 L 348 0 L 348 9 C 348 41 343 52 330 61 L 243 114 C 226 126 215 129 206 129 L 175 129 L 144 129 C 135 129 123 126 105 113 L 17 61 C 5 52 0 41 0 7 Z')",
        }}
      >
        <div
          className="text-7xl font-astrobia tracking-widest text-white/90"
          style={{
            width: "250px",
            textAlign: "center",
          }}
        >
          {formatTime(time)}
        </div>
        {weather.icon !== undefined && (
          <div className="text-white flex items-center">
            <img
              src={weather.icon}
              alt="Weather Icon"
              className="w-auto h-8"
              style={{ filter: "drop-shadow(2px 2px 20px #000000)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const Home = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);

  useEffect(() => {
    const handleCalendarUpdate = () => {
      console.log("Forcing MiniCalendar reload...");
      setCalendarKey((prev) => prev + 1); // Increment key to force re-mount
    };

    eventBus.on("events_updated", handleCalendarUpdate);

    return () => eventBus.off("events_updated", handleCalendarUpdate);
  }, []);

  return (
    <div className="flex flex-col gap-1 h-[864px]">
      <div className="flex gap-0.5 relative flex-row h-3/4 flex-grow ">
        <div
          className="flex w-[250px] flex-col gap-1 rounded-3xl overflow-hidden bg-gray-950/20 border border-white/20"
          style={{ userSelect: "none" }}
        >
          <img
            src="/main-background.jpg"
            alt="Background"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 ease-in-out"
            style={{
              objectPosition: "100%",
              userSelect: "none",
            }}
          />
        </div>

        <div
          className="absolute rounded-lg flex left-0 right-0 mx-64 -top-9 justify-center mr-[367px] z-10"
          data-tauri-drag-region
          style={{ userSelect: "none" }}
        >
          <Clock />
        </div>
        <img
          src="/signature.png"
          alt="Signature"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`absolute z-10 flex items-center justify-center duration-[320ms] w-[900px] h-auto top-9 right-56 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          style={{
            filter: "invert(100%) brightness(200%)",
            userSelect: "none",
          }}
        />
        <div
          className="flex flex-col w-full hover:brightness-95 duration-300 gap-1 rounded-3xl bg-gray-950/20 border border-white/20 p-6 relative overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            clipPath:
              "path('M 0 0 L 221 0 C 234 0 240 0 250 7 L 358 74 C 378 87 441 90 470 74 L 577 6 C 587 0 592 0 602 0 L 845 0 l 0 433 C 845 445 841 449 832 449 l -30 0 C 784 449 779 449 765 466 L 649 603 C 631 624 626 624 605 624 L 0 624 Z')",
            userSelect: "none",
          }}
        >
          <img
            src="/main-background.jpg"
            alt="Background"
            className={`absolute inset-0 w-full h-full object-cover rounded-3xl transition-transform duration-300 ease-in-out ${
              isHovered ? "scale-105" : "scale-100"
            }`}
            style={{ userSelect: "none" }}
          />
        </div>

        <div className="w-96 flex flex-col gap-1.5">
          <div className="flex-grow max-h-[72%] min-h-[72%] rounded-3xl bg-gray-950/40 p-6">
            <MiniCalendar key={calendarKey} />
          </div>
          <div
            className="relative flex-grow -left-[222px] rounded-r-3xl bg-gray-950/40 z-10"
            style={{
              width: "187%",
              clipPath:
                "path('M 172 0 L 567 0 l 1 169 L 67 169 C 56 169 47 163 43 154 C 40 146 40 135 48 124 L 141 14 C 145 10 146 9 151 6 C 158 2 165 0 170 0 Z')",
            }}
          >
            <UpcomingThings />
          </div>
        </div>
      </div>

      <div className="flex flex-row gap-1 h-[235px]">
        <div className="flex-grow rounded-3xl overflow-hidden bg-gray-950/40">
          <ProjectWheel />
        </div>
        <div className="w-[682px] rounded-3xl overflow-hidden bg-gray-950/40 p-1 flex justify-center items-center">
          <MusicPlayer />
        </div>
      </div>
    </div>
  );
};

export default Home;
