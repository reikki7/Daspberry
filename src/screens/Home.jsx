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
      setCalendarKey((prev) => prev + 1);
    };

    eventBus.on("events_updated", handleCalendarUpdate);

    return () => eventBus.off("events_updated", handleCalendarUpdate);
  }, []);

  return (
    <div className="flex flex-col gap-1 h-[864px]">
      <div className="flex gap-0.5 relative flex-row h-3/4 flex-grow ">
        <div
          className="flex w-[250px] flex-col gap-1.5 rounded-3xl overflow-hidden bg-gray-950/20 border border-white/20"
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
        <div
          className={`absolute z-10 flex items-center justify-center duration-[320ms] w-[300px] h-auto -bottom-8 left-[120px] ${
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <div
            className="flex flex-col gap-1.5 relative"
            style={{
              filter: "drop-shadow(0 6px 5px rgba(109, 4, 231, 0.7))",
              userSelect: "none",
            }}
          >
            <span className="absolute left-16 -top-2 font-montserrat drop-shadow">
              Made by
            </span>
            <img
              src="/signature.png"
              alt="Signature"
              onClick={() => setIsHovered(!isHovered)}
            />
          </div>
        </div>
        <div
          className="flex flex-col w-full duration-300 gap-1 rounded-3xl bg-gray-950/20 border border-white/20 p-6 relative overflow-hidden"
          onClick={() => setIsHovered(!isHovered)}
          style={{
            clipPath:
              "path('M 0 0 L 224 0 C 237 0 243 0 253 7 L 358 74 C 377 87 458 88 479 74 L 580 6 C 590 0 595 0 605 0 L 845 0 l -1 444 C 844 466 831 473 813 473 l -31 0 C 763 473 758 473 743 489 l -105 126 C 618 638 606 648 582 648 L 0 648 Z')",
            userSelect: "none",
          }}
        >
          <img
            src="/main-background.jpg"
            alt="Background"
            className="absolute inset-0 hover:scale-105 w-full h-full object-cover rounded-3xl transition-transform duration-300 ease-in-out"
            style={{ userSelect: "none" }}
          />
        </div>

        <div className="w-[255px] flex ml-1 flex-col gap-1.5">
          <div className="flex-grow max-h-[73%] min-h-[73%] rounded-3xl bg-gray-950/40 p-6">
            <MiniCalendar key={calendarKey} />
          </div>
          <div
            className="relative -left-[245px] rounded-r-3xl bg-gray-950/40 z-10"
            style={{
              width: "499px",
              height: "169px",
              clipPath:
                "path('M 172 0 L 567 0 l 1 169 L 67 169 C 56 169 47 163 43 154 C 40 146 40 135 48 124 L 141 14 C 145 10 146 9 151 6 C 158 2 165 0 170 0 Z')",
              userSelect: "none",
            }}
          >
            <div className="absolute inset-0 overflow-hidden">
              <UpcomingThings />
            </div>
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
