import React, { useState, useEffect } from "react";
import { CalendarIcon, Check, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";
import ScaleLoader from "react-spinners/ScaleLoader";
import AsanaLogo from "../assets/asana-logo.png";

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskIsComplete, setTaskIsComplete] = useState(null);
  const [taskDueDate, setTaskDueDate] = useState(null);
  const [fetchStrategy, setFetchStrategy] = useState("cache");

  const asanaApiKey = import.meta.env.VITE_ASANA_API_KEY;

  const asanaWorkspaceGid = import.meta.env.VITE_ASANA_WORKSPACE_GID;

  const CACHE_KEY = "asana_tasks_cache";
  const CACHE_EXPIRY_KEY = "asana_tasks_cache_expiry";
  const CACHE_DURATION = 1000 * 60 * 60 * 4;

  const CACHE_USER_KEY = "asana_user_details_cache";
  const CACHE_USER_EXPIRY_KEY = "asana_user_details_cache_expiry";
  const CACHE_USER_DURATION = 1000 * 60 * 60 * 24 * 7;

  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${asanaApiKey}`,
    },
  };

  const saveTasksToLocalStorage = (tasks) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(tasks));
      localStorage.setItem(
        CACHE_EXPIRY_KEY,
        (Date.now() + CACHE_DURATION).toString()
      );
    } catch (error) {
      console.error("Failed to save tasks to localStorage", error);
    }
  };

  const getTasksFromLocalStorage = () => {
    try {
      const cachedTasks = localStorage.getItem(CACHE_KEY);
      const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);

      if (cachedTasks && cacheExpiry) {
        const expiryTime = parseInt(cacheExpiry, 10);
        if (Date.now() < expiryTime) {
          return JSON.parse(cachedTasks);
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to retrieve tasks from localStorage", error);
      return null;
    }
  };

  const saveUserDetailsToLocalStorage = (userDetails) => {
    try {
      localStorage.setItem(CACHE_USER_KEY, JSON.stringify(userDetails));
      localStorage.setItem(
        CACHE_USER_EXPIRY_KEY,
        (Date.now() + CACHE_USER_DURATION).toString()
      );
    } catch (error) {
      console.error("Failed to save user details to localStorage", error);
    }
  };

  const getUserDetailsFromLocalStorage = () => {
    try {
      const cachedUserDetails = localStorage.getItem(CACHE_USER_KEY);
      const cacheExpiry = localStorage.getItem(CACHE_USER_EXPIRY_KEY);

      if (cachedUserDetails && cacheExpiry) {
        const expiryTime = parseInt(cacheExpiry, 10);
        if (Date.now() < expiryTime) {
          return JSON.parse(cachedUserDetails);
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to retrieve user details from localStorage", error);
      return null;
    }
  };

  const fetchUserDetailsFromTauriCache = async () => {
    try {
      const cachedData = await invoke("read_asana_user_details_cache");
      return JSON.parse(cachedData);
    } catch (error) {
      console.error("Failed to fetch user details from Tauri cache", error);
      return null;
    }
  };

  const cacheUserDetailsViaTauri = async (userDetails) => {
    try {
      await invoke("cache_asana_user_details", {
        data: JSON.stringify(userDetails),
      });
    } catch (error) {
      console.error("Failed to cache user details via Tauri", error);
    }
  };

  const fetchUserDetails = async () => {
    try {
      let userDetails = getUserDetailsFromLocalStorage();

      if (!userDetails) {
        userDetails = await fetchUserDetailsFromTauriCache();
      }

      if (!userDetails) {
        const response = await fetch(
          "https://app.asana.com/api/1.0/users",
          options
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user details");
        }

        const data = await response.json();
        userDetails = data.data.reduce((acc, user) => {
          const profileUrl = `https://app.asana.com/0/profile/${user.gid}`;
          acc[profileUrl] = user.name;
          return acc;
        }, {});

        saveUserDetailsToLocalStorage(userDetails);
        await cacheUserDetailsViaTauri(userDetails);
      }

      setUsers(userDetails);
    } catch (err) {
      console.error("Error fetching user details:", err);
    }
  };

  const replaceProfileLinks = (notes) => {
    if (!notes) return null;

    const replacements = [];
    const processedNotes = notes.replace(
      /https:\/\/app\.asana\.com\/0\/profile\/(\d{14}\d{2})/g,
      (fullMatch, gid) => {
        const baseGid = gid.slice(0, 14);

        const matchingUser = Object.entries(users).find(([url]) => {
          const userGid = url.match(/\/profile\/(\d{14})/);
          return userGid && userGid[1] === baseGid;
        });

        if (matchingUser) {
          const marker = `@@USER_${replacements.length}@@`;
          replacements.push(matchingUser[1]);
          return marker;
        }

        return fullMatch;
      }
    );

    // Split into segments by user markers and process accordingly
    return processedNotes
      .split(/(@@USER_\d+@@|\n|https?:\/\/[^\s,]+)/)
      .map((segment, index, array) => {
        // Handle user profile markers
        const markerMatch = segment.match(/@@USER_(\d+)@@/);
        if (markerMatch) {
          const userIndex = parseInt(markerMatch[1], 10);
          return (
            <span key={index} className="bg-blue-500/30 px-1 rounded">
              @{replacements[userIndex]}
            </span>
          );
        }

        // Handle URLs
        const urlMatch = segment.match(/https?:\/\/[^\s,]+/);
        if (urlMatch) {
          return (
            <a
              key={index}
              href={segment}
              className="text-blue-500 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {segment}
            </a>
          );
        }

        // Handle bullet points for indented lines
        if (/^\s{2,}/.test(segment)) {
          return (
            <div key={index} className="flex items-start">
              <span className="mr-2 text-white">•</span>
              <span>{segment.trim()}</span>
            </div>
          );
        }

        // Handle plain newlines for formatting
        if (segment === "\n") {
          const nextSegment = array[index + 1]; // Check the next segment
          if (nextSegment && /^\s{2,}/.test(nextSegment)) {
            // If the next segment is a bullet point, skip adding <br>
            return null;
          }
          return <br key={index} />;
        }

        // Default handling for plain text
        return <span key={index}>{segment}</span>;
      });
  };

  const cacheTasksViaTauri = async (tasks) => {
    try {
      await invoke("cache_asana_tasks", { data: JSON.stringify(tasks) });
    } catch (error) {
      console.error("Failed to cache tasks via Tauri", error);
    }
  };

  const fetchTasksFromTauriCache = async () => {
    try {
      const cachedData = await invoke("read_asana_tasks_cache");
      return JSON.parse(cachedData);
    } catch (error) {
      console.error("Failed to fetch tasks from Tauri cache", error);
      return null;
    }
  };

  const fetchTasks = async (strategy = "cache") => {
    try {
      setLoading(true);
      setError(null);

      await fetchUserDetails();

      let retrievedTasks = null;

      if (strategy === "cache") {
        // Try local storage first
        retrievedTasks = getTasksFromLocalStorage();

        // If not in local storage, try Tauri cache
        if (!retrievedTasks) {
          retrievedTasks = await fetchTasksFromTauriCache();
        }
      }

      // If no cached data or forced network fetch, fetch from network
      if (!retrievedTasks) {
        const response = await fetch(
          `https://app.asana.com/api/1.0/workspaces/${asanaWorkspaceGid}/tasks?assignee=me&completed_since=now`,
          options
        );

        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }

        const data = await response.json();
        const uncompletedTaskGids = data.data
          .filter((task) => !task.completed)
          .map((task) => task.gid);

        retrievedTasks = await fetchTaskDetails(uncompletedTaskGids);
      }

      // Update state and cache
      setTasks(retrievedTasks);
      saveTasksToLocalStorage(retrievedTasks);
      await cacheTasksViaTauri(retrievedTasks);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDetails = async (taskGids) => {
    try {
      const detailedTasks = await Promise.all(
        taskGids.map(async (taskGid) => {
          const response = await fetch(
            `https://app.asana.com/api/1.0/tasks/${taskGid}`,
            options
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch task ${taskGid}`);
          }

          const taskData = await response.json();
          return taskData.data;
        })
      );
      return detailedTasks;
    } catch (err) {
      console.error("Error fetching task details:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTasks(fetchStrategy);
  }, [fetchStrategy]);

  // PUT Asana function
  const putTask = async (taskGid, updates) => {
    try {
      const response = await fetch(
        `https://app.asana.com/api/1.0/tasks/${taskGid}`,
        {
          method: "PUT",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            authorization: "Bearer " + import.meta.env.VITE_ASANA_API_KEY,
          },
          body: JSON.stringify({ data: updates }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      const updatedTask = await response.json();
      return updatedTask.data;
    } catch (err) {
      console.error("Failed to update task:", err);
      throw err;
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setTaskIsComplete(task.completed);
    setTaskDueDate(task.due_on);
  };

  const closeModal = () => {
    setSelectedTask(null);
  };

  const handleTaskComplete = async (isComplete) => {
    try {
      const updatedTask = await putTask(selectedTask.gid, {
        completed: isComplete,
      });

      // Update local state
      setTaskIsComplete(isComplete);
      setSelectedTask(updatedTask);

      // Remove task from list if completed
      if (isComplete) {
        setTasks(tasks.filter((t) => t.gid !== selectedTask.gid));
      } else {
        setTasks(
          tasks.map((t) => (t.gid === updatedTask.gid ? updatedTask : t))
        );
      }
    } catch (err) {
      console.error("Failed to update task completion:", err);
    }
  };

  const handleTaskDateChange = async (newDate) => {
    try {
      const updatedTask = await putTask(selectedTask.gid, {
        due_on: newDate,
      });

      // Update local state
      setTaskDueDate(newDate);
      setSelectedTask(updatedTask);
      setTasks(tasks.map((t) => (t.gid === updatedTask.gid ? updatedTask : t)));
    } catch (err) {
      console.error("Failed to update task date:", err);
    }
  };

  if (loading)
    return (
      <div
        data-tauri-drag-region
        className="flex items-center mt-40 justify-center"
      >
        <ScaleLoader color="#8dccff" />
      </div>
    );

  if (error)
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg shadow">
        {error}
      </div>
    );

  return (
    <div data-tauri-drag-region className="h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 mt-1">
        <img src={AsanaLogo} alt="Asana Logo" className="w-32 h-auto" />
        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
          {tasks.length} Active
        </span>
        <button
          onClick={() => setFetchStrategy("network")}
          className="flex items-center gap-2 text-sm bg-blue-500/20 text-white px-3 py-1 rounded"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {tasks.length === 0 ? (
        <div className="text-white/70 text-center">
          No uncompleted tasks found.
        </div>
      ) : (
        <div className="space-y-4 flex flex-col w-full overflow-y-auto max-h-[calc(100vh-120px)]">
          {tasks.map((task) => (
            <button
              key={task.gid}
              className="bg-gradient-to-br border hover:backdrop-blur-md bg-gray-950/30 backdrop-blur-lg text-left p-4 rounded-lg hover:bg-[#c08feb]/20 shadow-lg hover:shadow-xl transition-all border-none outline-none"
              onClick={() => handleTaskClick(task)}
            >
              <div className="flex justify-between">
                <h3 className="font-semibold text-white line-clamp-2 truncate">
                  {task.name}
                </h3>
                {new Date(task.due_on) < new Date() && task.due_on !== null && (
                  <div className="bg-red-500/70 px-2 rounded-full text-sm flex items-center">
                    Overdue
                  </div>
                )}
              </div>
              <div className="text-sm mt-1 text-white/70 flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2 text-white/50" />
                {task.due_on
                  ? new Date(task.due_on).toLocaleDateString()
                  : "No due date"}
              </div>
              <div className="text-sm text-white/70 mt-2 line-clamp-3 whitespace-pre-wrap">
                {replaceProfileLinks(task.notes)}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedTask && (
        <div className="fixed rounded-3xl inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 px-4 py-8">
          <div className="bg-gray-950/60 rounded-lg overflow-hidden max-w-4xl w-full max-h-full flex flex-col">
            <div
              data-tauri-drag-region
              className="p-4 text-white relative flex justify-between items-center"
              style={{
                background:
                  "linear-gradient(to right, rgb(248, 103, 240, 0.2), rgba(0, 128, 255, 0.2), rgba(0, 255, 255, 0.2))",
              }}
            >
              <h3 className="text-xl font-bold truncate mr-6">
                {selectedTask.name}
              </h3>
              <button
                className="text-center p-2 duration-100 rounded-full text-white text-2xl font-bold hover:text-gray-300 focus:outline-none"
                onClick={closeModal}
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-scroll max-h-full custom-scrollbar">
              <div className="flex items-center justify-between">
                <div className="relative text-sm mb-4 group">
                  <div className="flex items-center space-x-2 px-3 py-2 rounded border border-white/20 hover:border-white/40 transition-colors">
                    <CalendarIcon className="w-4 h-4 text-white/50 pointer-events-none" />
                    <span
                      className={`pointer-events-none ${
                        taskDueDate && new Date(taskDueDate) < new Date()
                          ? "text-red-500"
                          : "text-white"
                      }`}
                    >
                      {taskDueDate
                        ? `${new Date(taskDueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}${
                            new Date(taskDueDate) < new Date()
                              ? " (Overdue)"
                              : ""
                          }`
                        : "No due date"}
                    </span>
                  </div>
                  <input
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 hover:cursor-pointer"
                    value={taskDueDate ? taskDueDate : ""}
                    onChange={(e) => handleTaskDateChange(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => handleTaskComplete(!taskIsComplete)}
                  className={`flex items-center gap-2 py-1 px-2 rounded duration-200 text-sm ${
                    taskIsComplete
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "border border-white hover:border-green-400 hover:text-green-400"
                  }`}
                >
                  <Check size={17} />
                  {taskIsComplete ? "Completed" : "Mark as Complete"}
                </button>
              </div>

              <div className="mb-4 whitespace-pre-wrap text-white/80">
                {replaceProfileLinks(selectedTask.notes)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
