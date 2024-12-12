import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  CalendarIcon,
  Check,
  RefreshCw,
  Trash2,
  Eye,
  Pencil,
  PlusCircle,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";
import ScaleLoader from "react-spinners/ScaleLoader";
import AsanaLogo from "../assets/asana-logo.png";
import AsanaLogoIcon from "../assets/asana-logo-icon.png";
import CustomDropdown from "./CustomDropdown";
import { Slide, ToastContainer, toast } from "react-toastify";
import { formatDistanceToNow } from "date-fns";
import "react-toastify/dist/ReactToastify.css";

const AsanaTasks = ({ isTaskAvailable }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskIsComplete, setTaskIsComplete] = useState(null);
  const [taskDueDate, setTaskDueDate] = useState(null);
  const [fetchStrategy, setFetchStrategy] = useState("cache");
  const [editMode, setEditMode] = useState(false);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [assigneeList, setAssigneeList] = useState([]);
  const [newTask, setNewTask] = useState({
    name: "",
    notes: "",
    due_on: "",
  });

  const dateInputRef = useRef(null);

  const asanaApiKey = import.meta.env.VITE_ASANA_API_KEY;
  const asanaWorkspaceGid = import.meta.env.VITE_ASANA_WORKSPACE_GID;

  const CACHE_KEY = "asana_tasks_cache";
  const CACHE_EXPIRY_KEY = "asana_tasks_cache_expiry";
  const CACHE_DURATION = 1000 * 60 * 60 * 4;

  const CACHE_USER_KEY = "asana_user_details_cache";
  const CACHE_USER_EXPIRY_KEY = "asana_user_details_cache_expiry";
  const CACHE_USER_DURATION = 1000 * 60 * 60 * 24 * 7;

  const defaultAssignee = import.meta.env.VITE_ASANA_DEFAULT_ASSIGNEE;

  const options = useMemo(
    () => ({
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${asanaApiKey}`,
      },
    }),
    [asanaApiKey]
  );

  const handleContainerClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
      dateInputRef.current.click();
    }
  };

  useEffect(() => {
    setAssigneeList(users);
  }, [users]);

  const [selectedAssignee, setSelectedAssignee] = useState(
    defaultAssignee || ""
  );

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

  const updateTasksCache = (updatedTasks) => {
    saveTasksToLocalStorage(updatedTasks);
    cacheTasksViaTauri(updatedTasks);
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

  // Description formatting
  const replaceProfileLinks = (notes) => {
    if (!notes) return null;

    const replacements = [];

    // Replace user profile links with names
    const processedNotes = notes.replace(
      /https:\/\/app\.asana\.com\/0\/profile\/(\d{14})\d*/g,
      (fullMatch, gid) => {
        const matchingUser = users.find((user) => user.gid.startsWith(gid));

        if (matchingUser) {
          const marker = `@@USER_${replacements.length}@@`;
          replacements.push(matchingUser.name);
          return marker;
        }

        return fullMatch;
      }
    );

    // Split notes into segments for processing
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

        // Handle plain newlines
        if (segment === "\n") {
          const nextSegment = array[index + 1];
          if (nextSegment && /^\s{2,}/.test(nextSegment)) {
            // If the next segment is a bullet point, skip adding <br>
            return null;
          }
          return <br key={index} />;
        }

        // Preserve plain text and spacing
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

  const addTask = async (assignee) => {
    toast.dismiss();
    try {
      if (!newTask.name.trim()) {
        toast.error("Task title cannot be empty.", {
          position: "top-center",
          closeOnClick: true,
          theme: "dark",
          toastId: "task-title-empty",
        });
        return;
      }

      const taskData = {
        data: {
          name: newTask.name,
          notes: newTask.notes || "",
          due_on: newTask.due_on || null,
          workspace: asanaWorkspaceGid,
          assignee: assignee,
        },
      };

      const response = await fetch(
        "https://app.asana.com/api/1.0/tasks?opt_fields=name,due_on,notes",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${asanaApiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(taskData),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setTasks((prevTasks) => {
          const updatedTasks = [...prevTasks, result.data];
          updateTasksCache(updatedTasks);
          return updatedTasks;
        });
      } else {
        const errorData = await response.json();
        console.error("Failed to create task:", errorData);
        alert("Failed to create task. Check console for details.");
      }
    } catch (err) {
      console.error("Error creating task:", err);
      alert("An error occurred while creating the task.");
    }
  };

  const fetchTaskDetails = useCallback(
    async (taskGids) => {
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
    },
    [options]
  );

  const fetchTasks = useCallback(
    async (strategy) => {
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

        setTasks(retrievedTasks);
        updateTasksCache(retrievedTasks);
        saveTasksToLocalStorage(retrievedTasks);
        await cacheTasksViaTauri(retrievedTasks);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [options, fetchTaskDetails]
  );

  // Fetch tasks on initial load
  useEffect(() => {
    fetchTasks(fetchStrategy);
  }, [fetchStrategy, fetchTasks]);

  // Update/Modify Task
  const updateTask = useCallback(
    async (taskGid, updates) => {
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
        setTasks((prevTasks) => {
          const updatedTasks = prevTasks.map((task) =>
            task.gid === taskGid ? updatedTask.data : task
          );
          updateTasksCache(updatedTasks);
          return updatedTasks;
        });
      } catch (err) {
        console.error("Error updating task:", err);
        throw err;
      }
    },
    [setTasks, updateTasksCache]
  );

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
      toast.dismiss();
      const updatedTask = await updateTask(selectedTask.gid, {
        completed: isComplete,
      });

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
      toast.error("Failed to update task completion.", {
        position: "top-center",
        toastId: "task-complete-error",
      });
    }
  };

  const handleTaskDateChange = async (newDate) => {
    try {
      await updateTask(selectedTask.gid, { due_on: newDate });

      // Update local state without replacing selectedTask
      setTaskDueDate(newDate);
      setSelectedTask((prevTask) => ({ ...prevTask, due_on: newDate }));
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.gid === selectedTask.gid ? { ...t, due_on: newDate } : t
        )
      );
    } catch (err) {
      console.error("Failed to update task date:", err);
    }
  };

  const clearAllFields = () => {
    setNewTask({ name: "", notes: "", due_on: "" });
    setNewTaskModalOpen(false);
    setSelectedTask(null);
    toast.dismiss();
  };

  const closeNewTaskModal = () => {
    setNewTaskModalOpen(false);
    setNewTask({ name: "", notes: "", due_on: "" });
    toast.dismiss();
  };

  if (error)
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg shadow">
        {error}
      </div>
    );

  return (
    <div className="mb-4 flex flex-col w-full overflow-y-auto">
      <ToastContainer
        id="toast-container"
        position="top-center"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        transition={Slide}
        pauseOnHover
      />
      <div className="flex justify-between items-center mb-4 mt-1">
        <div className="flex items-center gap-3">
          <img src={AsanaLogo} alt="Asana Logo" className="w-32 h-auto" />
          <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
            {tasks.length} Active
          </span>
        </div>
        <div className="flex">
          <button
            onClick={() => setFetchStrategy("network")}
            className="flex items-center gap-2 text-sm bg-blue-500/20 hover:bg-purple-500/20 duration-200 overflow-hidden text-white px-3 py-1.5 rounded-l-md"
          >
            <RefreshCw size={14} />
            <p className="-scroll mt-0.5">Refresh</p>
          </button>
          <button
            onClick={() => setNewTaskModalOpen(true)}
            className="flex items-center gap-2 text-sm bg-blue-500/20 hover:bg-purple-500/20 duration-200 overflow-hidden text-white px-3 py-1.5 rounded-r-md"
          >
            <PlusCircle size={14} />
            <p className="mt-0.5">Add Task</p>
          </button>
        </div>
      </div>

      <div
        className={`gap-4 w-full flex flex-col ${
          isTaskAvailable ? "h-[calc(100vh-500px)]" : "h-[calc(100vh-250px)]"
        } overflow-auto`}
      >
        {tasks?.length > 0 && !loading ? (
          tasks?.map((task) => (
            <button
              key={task?.gid}
              className="bg-gradient-to-br border hover:backdrop-blur-md bg-gray-950/30 backdrop-blur-lg text-left p-4 rounded-lg hover:bg-[#c08feb]/20 shadow-lg hover:shadow-xl transition-all border-none outline-none"
              onClick={() => handleTaskClick(task)}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-white line-clamp-2 truncate">
                  {task?.name}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center text-xs gap-2">
                    {task?.followers?.map((follower) => (
                      <div
                        key={follower?.gid}
                        className="flex items-center gap-1 border border-white border-opacity-25 bg-blue-950/30 text-white px-3 py-1 rounded-full"
                      >
                        <p>{follower?.name}</p>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    if (!task.due_on) return null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const dueDate = new Date(task.due_on);
                    dueDate.setHours(0, 0, 0, 0);

                    return dueDate < today ? (
                      <div className="bg-red-500/70 -ml-2 px-2 py-1 rounded-full text-xs flex items-center">
                        Overdue
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
              <div className="text-[13px] text-white/70 flex items-center mb-3">
                <CalendarIcon className="w-4 h-4 mr-2 -mt-0.5 text-white/50" />
                {task.due_on ? (
                  <>
                    {new Date(task.due_on).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                    {" — ("}
                    {formatDistanceToNow(new Date(task.due_on), {
                      addSuffix: true,
                    })}
                    {")"}
                  </>
                ) : (
                  "No due date"
                )}
              </div>
              <div className="text-sm text-white/70 mt-2 line-clamp-3 whitespace-pre-wrap">
                {replaceProfileLinks(task.notes)}
              </div>
            </button>
          ))
        ) : (
          <div
            data-tauri-drag-region
            className="flex items-center justify-center"
          >
            <div className="mt-20">
              <ScaleLoader color="#8dccff" />
            </div>
          </div>
        )}
      </div>

      {/* Selected Task Modal */}
      {selectedTask && (
        <div className="fixed rounded-3xl inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50 px-4 py-8">
          <div className="bg-gray-950/60 overflow-hidden rounded-lg max-w-4xl w-full max-h-full flex flex-col">
            <div
              data-tauri-drag-region
              className="p-4 text-white relative flex justify-between items-center"
              style={{
                background:
                  "linear-gradient(to right, rgb(248, 103, 240, 0.2), rgba(0, 128, 255, 0.2), rgba(0, 255, 255, 0.2))",
              }}
            >
              <img
                src={AsanaLogoIcon}
                alt="Asana Logo"
                className="w-8 mr-4 h-auto"
              />
              {/* Editable Title */}
              <input
                type="text"
                value={selectedTask.name}
                onChange={(e) =>
                  setSelectedTask({
                    ...selectedTask,
                    name: e.target.value,
                  })
                }
                className="text-white text-xl mr-1 truncate font-bold bg-transparent focus:outline-none"
                placeholder="Enter task title"
                onKeyDown={(e) => e.stopPropagation()}
                onBlur={async () => {
                  try {
                    if (!selectedTask.name.trim()) {
                      return;
                    }
                    await updateTask(selectedTask.gid, {
                      name: selectedTask.name,
                      notes: selectedTask.notes,
                      due_on: taskDueDate,
                    });
                    setTasks(
                      tasks?.map((task) =>
                        task?.gid === selectedTask.gid ? selectedTask : task
                      )
                    );
                  } catch (err) {
                    console.error("Failed to save task:", err);
                  }
                }}
                style={{ width: "100%" }}
              />
              <button
                className="text-center p-2 duration-100 rounded-full text-white text-2xl font-bold hover:text-gray-300 focus:outline-none"
                onClick={() => {
                  toast.dismiss();
                  if (!selectedTask.name.trim()) {
                    toast.error("Task title cannot be empty.", {
                      position: "top-center",
                      closeOnClick: true,
                      theme: "dark",
                      toastId: "task-title-empty",
                    });
                    return;
                  }
                  closeModal();
                  setEditMode(false);
                }}
              >
                &times;
              </button>
            </div>

            <div
              className={`p-6 overflow-y-auto ${
                editMode ? "h-[800px]" : "max-h-[800px]"
              }  custom-scrollbar`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm space-x-2 mb-4">
                  <div
                    onClick={handleContainerClick}
                    className={`flex items-center space-x-2 px-3 py-2 rounded border cursor-pointer ${(() => {
                      if (!taskDueDate)
                        return "border-white/20 hover:border-white/40";
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dueDate = new Date(taskDueDate);
                      dueDate.setHours(0, 0, 0, 0);
                      return dueDate < today
                        ? "border-red-500/50 hover:border-red-500/70"
                        : "border-white/20 hover:border-white/40";
                    })()} transition-colors`}
                  >
                    <CalendarIcon
                      className={`w-4 h-4 pointer-events-none ${(() => {
                        if (!taskDueDate) return "text-white/50";
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dueDate = new Date(taskDueDate);
                        dueDate.setHours(0, 0, 0, 0);
                        return dueDate < today
                          ? "text-red-500/70"
                          : "text-white/50";
                      })()}`}
                    />
                    <input
                      type="date"
                      ref={dateInputRef}
                      className="text-white bg-transparent border-none focus:outline-none cursor-pointer"
                      value={taskDueDate || ""}
                      onChange={(e) => handleTaskDateChange(e.target.value)}
                      style={{ visibility: "hidden", position: "absolute" }}
                    />
                    <span className="text-white" style={{ userSelect: "none" }}>
                      {taskDueDate
                        ? new Date(taskDueDate).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "Select a date"}
                    </span>
                  </div>

                  {(() => {
                    if (!taskDueDate) return null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const dueDate = new Date(taskDueDate);
                    dueDate.setHours(0, 0, 0, 0);

                    return dueDate < today ? (
                      <div className="bg-red-500/70 px-2 py-1 rounded-full text-xs">
                        Overdue
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-1">
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-white border p-[7px] border-white/80 hover:border-white/40 rounded text-sm duration-200 flex items-center gap-1"
                    >
                      <Pencil size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditMode(false)}
                      className="text-white border p-[7px] border-white/80 hover:border-white/40 rounded text-sm duration-200 flex items-center gap-1"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      closeModal();
                      try {
                        await fetch(
                          `https://app.asana.com/api/1.0/tasks/${selectedTask.gid}`,
                          {
                            method: "DELETE",
                            headers: {
                              accept: "application/json",
                              authorization: `Bearer ${asanaApiKey}`,
                            },
                          }
                        );
                        setTasks((prevTasks) => {
                          const updatedTasks = prevTasks.filter(
                            (task) => task.gid !== selectedTask.gid
                          );
                          updateTasksCache(updatedTasks); // Update the cache
                          return updatedTasks;
                        });
                      } catch (err) {
                        console.error("Failed to delete task:", err);
                      }
                    }}
                    className="text-red-500 mr-2 border p-[7px] border-red-500/80 hover:border-red-500/40 rounded text-sm duration-200 flex items-center gap-1"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => {
                      handleTaskComplete(!taskIsComplete);
                    }}
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
              </div>

              <div className="">
                {!editMode ? (
                  // Description
                  <div
                    className="mb-4 whitespace-pre-wrap text-white/80"
                    style={{ height: "100%" }}
                  >
                    {replaceProfileLinks(selectedTask.notes)}
                  </div>
                ) : (
                  // Edit Mode
                  <textarea
                    value={selectedTask.notes}
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        notes: e.target.value,
                      })
                    }
                    className="mb-4 whitespace-pre-wrap text-white/80 focus:outline-none bg-transparent w-full border h-[550px] p-2"
                    placeholder="Enter task description"
                    onKeyDown={(e) => e.stopPropagation()}
                    onBlur={async () => {
                      try {
                        await updateTask(selectedTask.gid, {
                          name: selectedTask.name,
                          notes: selectedTask.notes,
                          due_on: taskDueDate,
                        });
                        setTasks(
                          tasks?.map((task) =>
                            task?.gid === selectedTask.gid ? selectedTask : task
                          )
                        );
                      } catch (err) {
                        console.error("Failed to save task:", err);
                      }
                    }}
                  />
                )}
              </div>
              {/* Collaborators */}
              <hr className="my-5 border-t border-gray-300/40" />
              <h3 className="text-md font-semibold">Collaborators</h3>
              <div className="flex items-center gap-2 mt-4">
                {selectedTask?.followers?.map((follower) => (
                  <div
                    key={follower.gid}
                    className="flex items-center text-sm gap-1 border bg-blue-950/40 text-white px-4 py-1.5 rounded-full"
                  >
                    <p>{follower.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {newTaskModalOpen && (
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
              <img
                src={AsanaLogoIcon}
                alt="Asana Logo"
                className="w-8 mr-4 h-auto"
              />
              {/* Editable Title */}
              <input
                type="text"
                value={newTask.name}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    name: e.target.value,
                  })
                }
                style={{ width: "100%" }}
                onKeyDown={(e) => e.stopPropagation()}
                className="text-white text-xl font-bold bg-transparent focus:outline-none"
                placeholder="Enter task title"
              />
              <button
                className="text-center p-2 duration-100 rounded-full text-white text-2xl font-bold hover:text-gray-300 focus:outline-none"
                onClick={() => {
                  clearAllFields();
                  setSelectedAssignee(defaultAssignee);
                }}
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto h-[800px] custom-scrollbar">
              <div className="relative flex justify-between text-sm mb-4 group">
                <div
                  className="flex items-center space-x-2 px-3 py-2 cursor-pointer rounded border border-white/20 hover:border-white/40 transition-colors"
                  onClick={handleContainerClick}
                >
                  <CalendarIcon className="w-4 h-4 text-white/50 pointer-events-none" />
                  <input
                    type="date"
                    ref={dateInputRef}
                    style={{ visibility: "hidden", position: "absolute" }}
                    className="text-white bg-transparent border-none focus:outline-none"
                    value={newTask.due_on}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        due_on: e.target.value,
                      })
                    }
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <span className="text-white" style={{ userSelect: "none" }}>
                    {newTask.due_on
                      ? new Date(newTask.due_on).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "Select a date"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <CustomDropdown
                      assignees={assigneeList}
                      selectedAssignee={selectedAssignee}
                      setSelectedAssignee={setSelectedAssignee}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      toast.dismiss();
                      try {
                        if (!newTask.name.trim()) {
                          toast.error("Task title cannot be empty.", {
                            position: "top-center",
                            closeOnClick: true,
                            theme: "dark",
                            toastId: "task-title-empty",
                          });
                          return;
                        }
                        setNewTaskModalOpen(false);
                        await addTask(selectedAssignee);
                      } catch (err) {
                        console.error("Failed to add task:", err);
                      }
                    }}
                    className="bg-cyan-500/50 hover:bg-blue-500/50 duration-300 rounded-full text-white px-4 py-2 flex items-center"
                  >
                    <PlusCircle size={20} className="mr-2" />
                    <p className="text-sm mt-0.5">Add Task</p>
                  </button>
                </div>
              </div>

              <div
                className="h-full"
                style={{ height: "calc(100% - 60px)", minHeight: "200px" }}
              >
                <textarea
                  value={newTask.notes}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      notes: e.target.value,
                    })
                  }
                  className="w-full h-full bg-transparent text-white text-sm whitespace-pre-wrap border border-white/20 focus:border-white/40 rounded focus:outline-none p-2"
                  placeholder="Enter task description"
                  rows={5}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsanaTasks;
