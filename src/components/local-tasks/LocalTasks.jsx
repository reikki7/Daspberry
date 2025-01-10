import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
  useMemo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/tauri";
import { syncLocalTasksWithFirestore } from "../../utils/syncLocalTasks";
import { db } from "../../config/firebase";
import { doc, deleteDoc, setDoc, writeBatch } from "firebase/firestore";
import { FaCopy } from "react-icons/fa";
import { PlusCircle, BookCheck, ClipboardPenLine } from "lucide-react";

const SyntaxHighlighter = lazy(() =>
  import("react-syntax-highlighter").then((module) => ({
    default: module.Prism,
  }))
);
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyToClipboard } from "react-copy-to-clipboard";
import "react-toastify/dist/ReactToastify.css";
import eventBus from "../../utils/eventBus";

import ProjectFilter from "./ProjectFilter";

const LocalTaskList = lazy(() => import("./LocalTaskList"));
import SelectedLocalTaskModal from "./SelectedLocalTaskModal";
import CompletedLocalTaskModal from "./CompletedLocalTaskModal";
import NewLocalTaskModal from "./NewLocalTaskModal";

const DELETED_TASKS_COLLECTION = "Deleted Tasks";

const LocalTasks = ({ setIsTaskAvailable }) => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [completedTasksModalOpen, setCompletedTasksModalOpen] = useState(false);
  const [taskIsComplete, setTaskIsComplete] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notification, setNotification] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentProjectFilter, setCurrentProjectFilter] = useState("all");
  const initialTaskRef = useRef(null);

  // Include project as empty string by default
  const [newTask, setNewTask] = useState({
    title: "",
    date: "",
    description: "",
    project: "",
    completed: false,
    updated_at: new Date().toISOString(),
    pending_sync: !isOnline,
  });

  const dateInputRef = useRef(null);
  const ITEMS_PER_PAGE = 5;

  const saveTasks = async (updatedTasks) => {
    try {
      await invoke("save_local_tasks", { tasks: updatedTasks });
    } catch (error) {
      console.error("Error saving tasks:", error);
    }
  };

  const loadTasks = async () => {
    try {
      const loadedTasks = await invoke("load_local_tasks");
      if (Array.isArray(loadedTasks)) {
        setTasks(loadedTasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  useEffect(() => {
    loadTasks();
    syncLocalTasksWithFirestore(tasks, setTasks, saveTasks);
  }, []);

  // 3) Sync whenever user goes back online
  useEffect(() => {
    const syncPendingTasks = async () => {
      if (isOnline) {
        const tasksToSync = tasks.filter((task) => task.pending_sync);
        if (tasksToSync.length > 0) {
          await syncLocalTasksWithFirestore(tasksToSync, setTasks, saveTasks);

          // Mark synced tasks as not pending
          const updatedTasks = tasks.map((task) =>
            task.pending_sync ? { ...task, pending_sync: false } : task
          );
          setTasks(updatedTasks);
          await saveTasks(updatedTasks);
        }
      }
    };

    // Debounce sync logic to avoid frequent calls
    const debounceSync = setTimeout(() => {
      syncPendingTasks();
    }, 1000);

    return () => clearTimeout(debounceSync);
  }, [isOnline, tasks]);

  useEffect(() => {
    if (tasks.length > 0) {
      saveTasks(tasks);
    }
  }, [tasks]);

  useEffect(() => {
    const distinctProjects = [
      ...new Set(tasks.map((t) => t.project).filter(Boolean)),
    ];
    setProjects(distinctProjects);
  }, [tasks]);

  const handleContainerClick = () => {
    if (dateInputRef.current) {
      if (dateInputRef.current.showPicker) {
        dateInputRef.current.showPicker();
      } else {
        console.warn("showPicker is not supported in this browser.");
      }
    }
  };

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      showNotification("Task title cannot be empty.", "error");
      return;
    }

    setNewTaskModalOpen(false);

    checkOnlineStatus();

    if (newTask.project && !projects.includes(newTask.project)) {
      setProjects((prev) => [...prev, newTask.project]);
    }

    const newTaskEntry = {
      id: uuidv4(),
      title: newTask.title,
      date: newTask.date || "",
      description: newTask.description,
      project: newTask.project || "",
      completed: false,
      completed_on: null,
      updated_at: new Date().toISOString(),
      pending_sync: !isOnline,
    };

    const updatedTasks = [...tasks, newTaskEntry];
    setTasks(updatedTasks);

    // Save tasks locally
    void (async () => {
      try {
        await saveTasks(updatedTasks);
      } catch (error) {
        console.error("Error saving tasks locally:", error);
      }

      // Sync with Firestore in background
      if (isOnline) {
        try {
          await syncLocalTasksWithFirestore(updatedTasks, setTasks, saveTasks);
        } catch (error) {
          console.error("Error syncing tasks:", error);
        }
      }

      // 5) Also call Tauri `invoke` in background
      try {
        await invoke("save_local_tasks", { tasks: updatedTasks });
        eventBus.emit("events_updated");
      } catch (error) {
        console.error("Error invoking Tauri save:", error);
      }
    })();

    // Finally, reset the newTask form
    setNewTask({
      title: "",
      date: "",
      description: "",
      project: "",
    });
  };

  const handleFilterChange = (project) => {
    setCurrentProjectFilter(project);
    setCurrentPage(1); // Reset to the first page
  };

  const processTaskDescription = (notes) => {
    if (!notes) return null;
    return notes
      .split(/(`{3}[\s\S]*?`{3}|https?:\/\/[^\s]+|\n|- )/g)
      .map((segment, index, array) => {
        const codeBlockMatch = segment.match(/`{3}(\w+)?\n([\s\S]*?)\n`{3}/);
        if (codeBlockMatch) {
          const language = codeBlockMatch[1]?.trim() || "text";
          const code = codeBlockMatch[2]?.trim();
          return (
            <div style={{ position: "relative" }} key={index} tabIndex={-1}>
              <CopyToClipboard text={code}>
                <>
                  {isModalOpen && (
                    <button
                      onClick={() => setCopied(true)}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        zIndex: 20,
                      }}
                    >
                      <FaCopy size={17} color={copied ? "#0be2a8" : "white"} />
                    </button>
                  )}
                </>
              </CopyToClipboard>
              <Suspense fallback={null}>
                <SyntaxHighlighter
                  tabIndex={-1}
                  language={language}
                  style={nightOwl}
                  wrapLongLines={true}
                  showLineNumbers={false}
                  customStyle={{
                    padding: "1em",
                    borderRadius: "1em",
                    opacity: 0.9,
                  }}
                >
                  {code}
                </SyntaxHighlighter>
              </Suspense>
            </div>
          );
        }

        // Handle URLs
        if (segment.match(/https?:\/\/[^\s]+/)) {
          return (
            <a
              key={index}
              href={segment}
              className="text-blue-500 underline"
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={-1}
            >
              {segment}
            </a>
          );
        }

        // Handle bullet points
        if (segment === "- ") {
          const nextSegment = array[index + 1]?.trim();
          if (nextSegment) {
            array[index + 1] = "";
            return (
              <div key={index} className="flex items-start" tabIndex={-1}>
                <span className="mr-2 text-white" tabIndex={-1}>
                  •
                </span>
                <span className="whitespace-pre-wrap" tabIndex={-1}>
                  {nextSegment}
                </span>
              </div>
            );
          }
        }

        if (segment === "\n") {
          const nextSegment = array[index + 1];
          if (nextSegment === "- ") {
            return null;
          }
          return <br key={index} />;
        }

        return (
          <span key={index} className="whitespace-pre-wrap" tabIndex={-1}>
            {segment}
          </span>
        );
      })
      .filter(Boolean);
  };

  const checkOnlineStatus = async () => {
    try {
      await fetch("https://firebase.google.com", { mode: "no-cors" });
      setIsOnline(true);
    } catch (error) {
      setIsOnline(false);
    }
  };

  const handleUpdateTask = () => {
    if (!selectedTask.title.trim()) {
      showNotification("Task title cannot be empty.", "error");
      return;
    }

    setSelectedTask(null);
    setErrorMessage("");
    setEditMode(false);
    setCopied(false);
    setIsModalOpen(false);

    // Check or update project list (if user typed a new project)
    if (selectedTask.project && !projects.includes(selectedTask.project)) {
      setProjects((prev) => [...prev, selectedTask.project]);
    }

    // Prepare the updated task with new timestamp
    const updatedTask = {
      ...selectedTask,
      updated_at: new Date().toISOString(),
      pending_sync: !isOnline,
    };

    // Update local tasks immediately (so the UI reflects it)
    const newTasks = tasks.map((t) =>
      t.id === updatedTask.id ? updatedTask : t
    );
    setTasks(newTasks);

    // Fire-and-forget the database sync in the background
    void (async () => {
      try {
        // Save to local storage
        await saveTasks(newTasks);

        // If online, sync with Firestore
        if (isOnline) {
          await syncLocalTasksWithFirestore(newTasks, setTasks, saveTasks);
        }
        eventBus.emit("events_updated");
      } catch (error) {
        console.error("Error saving updated task:", error);
      }
    })();
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    const batch = writeBatch(db);

    // Delete the task
    batch.delete(doc(db, "Local Tasks", selectedTask.id));

    // Add deletion record
    batch.set(doc(db, DELETED_TASKS_COLLECTION, selectedTask.id), {
      deleted_at: new Date().toISOString(),
    });

    await batch.commit();

    const updatedTasks = tasks.filter((task) => task.id !== selectedTask.id);
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    setSelectedTask(null);
    eventBus.emit("events_updated");
  };

  const clearAllFields = () => {
    setNewTask({ title: "", date: "", description: "", project: "" });
    setNewTaskModalOpen(false);
    setSelectedTask(null);
    setErrorMessage("");
    setEditMode(false);
  };

  const closeSelectedTaskModal = () => {
    if (selectedTask) {
      const initialTask = JSON.parse(initialTaskRef.current || "{}");

      if (JSON.stringify(selectedTask) === JSON.stringify(initialTask)) {
        setSelectedTask(null);
        setIsModalOpen(false);
        return;
      }
    }
    handleUpdateTask();
    setSelectedTask(null);
    setErrorMessage("");
    setEditMode(false);
    setCopied(false);
    setIsModalOpen(false);
    eventBus.emit("events_updated");
  };

  const handleTaskClick = useCallback(
    (task) => {
      setSelectedTask(task);
      initialTaskRef.current = JSON.stringify(task);
      setTaskIsComplete(task.completed);
      setIsModalOpen(true);
    },
    [setSelectedTask, setTaskIsComplete, setIsModalOpen]
  );

  const handleTaskComplete = async (taskId, isComplete) => {
    const completed_on = isComplete ? new Date().toISOString() : null;
    const updated_at = new Date().toISOString();

    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, completed: isComplete, completed_on, updated_at }
        : task
    );

    setTasks(updatedTasks);

    // Save tasks locally
    await saveTasks(updatedTasks);

    // Sync the specific task with Firestore
    const updatedTask = updatedTasks.find((task) => task.id === taskId);

    if (updatedTask) {
      setTaskIsComplete(isComplete);
    }

    // Remove oldest completed tasks if necessary
    deleteOldestCompletedTasks(updatedTasks);

    // Save tasks locally
    await saveTasks(updatedTasks);

    // Sync the specific task with Firestore
    if (updatedTask && isOnline) {
      try {
        const docRef = doc(db, "Local Tasks", updatedTask.id);
        await setDoc(docRef, updatedTask, { merge: true }); // Update Firestore
        // console.log(`Task ${updatedTask.id} updated in Firestore.`);
      } catch (error) {
        console.error("Error updating task in Firestore:", error);
      }
    }
  };

  const distinctIncompleteProjects = useMemo(() => {
    const incompleteProjects = tasks
      .filter((t) => !t.completed)
      .map((t) => t.project);

    return [...new Set(incompleteProjects)].filter(Boolean);
  }, [tasks]);

  const deleteTaskById = async (taskId) => {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    await deleteDoc(doc(db, "Local Tasks", taskId));
    eventBus.emit("events_updated");
  };

  const deleteOldestCompletedTasks = (tasks) => {
    const completedTasks = tasks.filter((task) => task.completed_on);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const oldCompletedTasks = completedTasks.filter(
      (task) => new Date(task.completed_on) < threeMonthsAgo
    );

    const remainingCompletedTasks = completedTasks.filter(
      (task) => new Date(task.completed_on) >= threeMonthsAgo
    );

    if (remainingCompletedTasks.length > 50) {
      const sortedCompletedTasks = remainingCompletedTasks.sort(
        (a, b) => new Date(a.completed_on) - new Date(b.completed_on)
      );
      const tasksToDelete = sortedCompletedTasks.slice(
        0,
        remainingCompletedTasks.length - 50
      );
      tasksToDelete.forEach((task) => {
        deleteTaskById(task.id);
      });
    }

    oldCompletedTasks.forEach((task) => {
      deleteTaskById(task.id);
    });

    eventBus.emit("events_updated");
  };

  // Replace your existing totalIncompleteTasks calculation with this:
  const totalIncompleteTasks = useMemo(() => {
    let filteredTasks = tasks.filter((task) => !task.completed);

    if (currentProjectFilter !== "all") {
      filteredTasks = filteredTasks.filter((task) =>
        currentProjectFilter === "No Project"
          ? !task.project
          : task.project === currentProjectFilter
      );
    }

    return filteredTasks.length;
  }, [tasks, currentProjectFilter]);

  // Pagination
  const totalPages = useMemo(() => {
    let filteredTasks = tasks.filter((task) => !task.completed);

    // Apply project filter
    if (currentProjectFilter !== "all") {
      filteredTasks = filteredTasks.filter((task) =>
        currentProjectFilter === "No Project"
          ? !task.project
          : task.project === currentProjectFilter
      );
    }

    return Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  }, [tasks, currentProjectFilter, ITEMS_PER_PAGE]);

  const currentTasks = useMemo(() => {
    let filteredTasks = tasks.filter((task) => !task.completed);

    // Apply project filter
    if (currentProjectFilter !== "all") {
      filteredTasks = filteredTasks.filter((task) =>
        currentProjectFilter === "Unassigned"
          ? !task.project || task.project === ""
          : task.project === currentProjectFilter
      );
    }

    // Sort tasks as before
    const tasksWithDueDate = filteredTasks
      .filter((task) => task.date)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime() || Infinity;
        const dateB = new Date(b.date).getTime() || Infinity;
        const now = new Date().getTime();

        const isOverdueA = dateA < now;
        const isOverdueB = dateB < now;

        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;

        return dateA - dateB;
      });

    const tasksWithoutDueDate = filteredTasks
      .filter((task) => !task.date)
      .sort((a, b) => a.title.localeCompare(b.title));

    return [...tasksWithDueDate, ...tasksWithoutDueDate].slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [tasks, currentPage, currentProjectFilter]);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  useEffect(() => {
    if (tasks.filter((task) => !task.completed).length > 0) {
      setIsTaskAvailable(true);
    } else {
      setIsTaskAvailable(false);
    }
  }, [tasks, setIsTaskAvailable]);

  const handleTitleChange = useCallback((e) => {
    setSelectedTask((prevTask) => ({
      ...prevTask,
      title: e.target.value,
    }));
    eventBus.emit("events_updated");
  }, []);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-4 items-center">
        {/* Title and TODO Count */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl flex gap-2 items-center font-medium text-white">
            <ClipboardPenLine size={20} />
            <span className="tracking-wide">TODO</span>
          </h1>
          <span className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-white px-3 py-1.5 rounded-md shadow-sm text-sm font-medium">
            {totalIncompleteTasks} Tasks
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ProjectFilter
            tasks={tasks}
            onFilterChange={handleFilterChange}
            setCurrentPage={setCurrentPage}
          />

          {/* Action Buttons */}
          <div className="flex rounded-lg overflow-hidden">
            {/* Completed Tasks Button */}
            <button
              onClick={() => setCompletedTasksModalOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/30 text-green-200 shadow-sm hover:shadow-md hover:bg-emerald-500/50 transition-all duration-300 text-sm font-medium"
            >
              <BookCheck size={16} />
            </button>

            {/* Add Task Button */}
            <button
              onClick={() => setNewTaskModalOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-purple-500/20 text-white shadow-sm hover:shadow-md hover:bg-purple-500/40 transition-all duration-300 text-sm font-medium"
            >
              <PlusCircle size={16} />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <LocalTaskList
          tasks={currentTasks}
          handleTaskClick={handleTaskClick}
          currentPage={currentPage}
          totalPages={totalPages}
          goToPreviousPage={goToPreviousPage}
          goToNextPage={goToNextPage}
          setCurrentPage={setCurrentPage}
          totalIncompleteTasks={totalIncompleteTasks}
          processTaskDescription={processTaskDescription}
        />
      </Suspense>

      {/* Task Modal */}
      {selectedTask && (
        <SelectedLocalTaskModal
          tasks={tasks}
          setTasks={setTasks}
          saveTasks={saveTasks}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          handleTitleChange={handleTitleChange}
          handleUpdateTask={handleUpdateTask}
          closeSelectedTaskModal={closeSelectedTaskModal}
          errorMessage={errorMessage}
          editMode={editMode}
          setEditMode={setEditMode}
          handleContainerClick={handleContainerClick}
          dateInputRef={dateInputRef}
          handleDeleteTask={handleDeleteTask}
          taskIsComplete={taskIsComplete}
          handleTaskComplete={handleTaskComplete}
          processTaskDescription={processTaskDescription}
          projects={distinctIncompleteProjects}
          setProjects={setProjects}
          isOnline={isOnline}
        />
      )}

      {/* New Task Modal */}
      {newTaskModalOpen && (
        <NewLocalTaskModal
          newTask={newTask}
          setNewTask={setNewTask}
          handleAddTask={handleAddTask}
          clearAllFields={clearAllFields}
          setNewTaskModalOpen={setNewTaskModalOpen}
          dateInputRef={dateInputRef}
          handleContainerClick={handleContainerClick}
          notification={notification}
          setNotification={setNotification}
          projects={distinctIncompleteProjects}
          setProjects={setProjects}
        />
      )}

      {/* Completed Tasks Modal */}
      {completedTasksModalOpen && (
        <CompletedLocalTaskModal
          tasks={tasks}
          setCompletedTasksModalOpen={setCompletedTasksModalOpen}
          handleTaskComplete={handleTaskComplete}
          processTaskDescription={processTaskDescription}
        />
      )}
    </div>
  );
};

export default LocalTasks;
