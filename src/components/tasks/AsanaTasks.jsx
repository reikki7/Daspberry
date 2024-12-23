import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
  lazy,
} from "react";
import { RefreshCw, PlusCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";
import AsanaLogo from "../../assets/asana-logo.png";
import { Slide, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { debounce } from "lodash";
import eventBus from "../../utils/eventBus";

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

  const AsanaTaskList = lazy(() => import("../tasks/AsanaTaskList"));
  const SelectedAsanaTaskModal = lazy(() =>
    import("../tasks/SelectedAsanaTaskModal")
  );
  const NewAsanaTaskModal = lazy(() => import("../tasks/NewAsanaTaskModal"));

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

  const debouncedSaveTasks = useCallback(
    debounce((data) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(
          CACHE_EXPIRY_KEY,
          (Date.now() + CACHE_DURATION).toString()
        );
      } catch (error) {
        console.error("Failed to save tasks to localStorage", error);
      }
    }, 1000),
    []
  );

  const saveTasksToLocalStorage = (tasks) => {
    debouncedSaveTasks(tasks);
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
    eventBus.emit("events_updated");
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
      const response = await fetch(
        "https://app.asana.com/api/1.0/users",
        options
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user details");
      }

      const data = await response.json();
      const userDetails = data.data.map((user) => ({
        gid: user.gid,
        name: user.name,
      }));

      setUsers(userDetails);
      saveUserDetailsToLocalStorage(userDetails);
      await cacheUserDetailsViaTauri(userDetails);
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
          eventBus.emit("events_updated");
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

        let userDetails = getUserDetailsFromLocalStorage();

        if (!userDetails) {
          userDetails = await fetchUserDetailsFromTauriCache();
        }

        if (!userDetails) {
          // Fallback: Fetch from network if cache misses
          await fetchUserDetails();
        } else {
          setUsers(userDetails);
        }

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
          eventBus.emit("events_updated");
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
      eventBus.emit("events_updated");

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
      eventBus.emit("events_updated");
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

      <Suspense fallback={null}>
        {/* Task List */}
        <div
          className={`gap-4 w-full flex flex-col ${
            isTaskAvailable ? "h-[calc(100vh-500px)]" : "h-[calc(100vh-250px)]"
          } overflow-auto`}
        >
          <AsanaTaskList
            tasks={tasks}
            handleTaskClick={handleTaskClick}
            loading={loading}
            replaceProfileLinks={replaceProfileLinks}
          />
        </div>

        {/* Selected Task Modal */}
        {selectedTask && (
          <SelectedAsanaTaskModal
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
            taskDueDate={taskDueDate}
            handleTaskDateChange={handleTaskDateChange}
            closeModal={closeModal}
            setEditMode={setEditMode}
            editMode={editMode}
            setTasks={setTasks}
            tasks={tasks}
            updateTask={updateTask}
            asanaApiKey={asanaApiKey}
            updateTasksCache={updateTasksCache}
            handleTaskComplete={handleTaskComplete}
            taskIsComplete={taskIsComplete}
            toast={toast}
            replaceProfileLinks={replaceProfileLinks}
            dateInputRef={dateInputRef}
            handleContainerClick={handleContainerClick}
          />
        )}

        {/* New Task Modal */}
        {newTaskModalOpen && (
          <NewAsanaTaskModal
            newTask={newTask}
            setNewTask={setNewTask}
            clearAllFields={clearAllFields}
            handleContainerClick={handleContainerClick}
            dateInputRef={dateInputRef}
            setNewTaskModalOpen={setNewTaskModalOpen}
            assigneeList={assigneeList}
            selectedAssignee={selectedAssignee}
            setSelectedAssignee={setSelectedAssignee}
            defaultAssignee={defaultAssignee}
            addTask={addTask}
          />
        )}
      </Suspense>
    </div>
  );
};

export default AsanaTasks;
