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
import { doc, deleteDoc, setDoc } from "firebase/firestore";
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

const LocalTaskList = lazy(() => import("./LocalTaskList"));
import SelectedLocalTaskModal from "./SelectedLocalTaskModal";
import CompletedLocalTaskModal from "./CompletedLocalTaskModal";
import NewLocalTaskModal from "./NewLocalTaskModal";

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

    await checkOnlineStatus();

    setNewTaskModalOpen(false);

    // If user typed a project that isn’t in the list, add it.
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
    await saveTasks(updatedTasks);

    if (isOnline) {
      await syncLocalTasksWithFirestore(updatedTasks, setTasks, saveTasks);
    }

    try {
      await invoke("save_local_tasks", { tasks: updatedTasks });
      eventBus.emit("events_updated");
    } catch (error) {
      console.error("Error saving tasks:", error);
    }

    // Reset the newTask form
    setNewTask({
      title: "",
      date: "",
      description: "",
      project: "",
    });
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
            <div style={{ position: "relative" }} key={index}>
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
              <div key={index} className="flex items-start">
                <span className="mr-2 text-white">•</span>
                <span className="whitespace-pre-wrap">{nextSegment}</span>
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
          <span key={index} className="whitespace-pre-wrap">
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

  const handleUpdateTask = async () => {
    if (!selectedTask.title.trim()) {
      showNotification("Task title cannot be empty.", "error");
      return;
    }

    await checkOnlineStatus();

    if (selectedTask.project && !projects.includes(selectedTask.project)) {
      setProjects((prev) => [...prev, selectedTask.project]);
    }

    const updatedTasks = tasks.map((task) =>
      task.id === selectedTask.id ? selectedTask : task
    );
    setTasks(updatedTasks);
    eventBus.emit("events_updated");
    setSelectedTask(null);
    setErrorMessage("");

    try {
      // Update task with timestamp
      const updatedTask = {
        ...selectedTask,
        updated_at: new Date().toISOString(),
        pending_sync: !isOnline,
      };

      // Update local state
      const updatedTasks = tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      );

      await saveTasks(updatedTasks);

      if (isOnline) {
        await syncLocalTasksWithFirestore(updatedTasks, setTasks, saveTasks);
      }
    } catch (error) {
      console.error("Error saving updated task:", error);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    const updatedTasks = tasks.filter((task) => task.id !== selectedTask.id);

    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    eventBus.emit("events_updated");
    setSelectedTask(null);
    await deleteDoc(doc(db, "Local Tasks", selectedTask.id));
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
    console.log("Task Complete Status:", taskIsComplete);
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
        console.log(`Task ${updatedTask.id} updated in Firestore.`);
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

  const totalIncompleteTasks = tasks.filter((task) => !task.completed).length;

  // Pagination
  const totalPages = Math.ceil(
    tasks.filter((task) => !task.completed).length / ITEMS_PER_PAGE
  );

  const currentTasks = useMemo(() => {
    const tasksWithDueDate = tasks
      .filter((task) => task.date && !task.completed)
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

    const tasksWithoutDueDate = tasks
      .filter((task) => !task.date && !task.completed)
      .sort((a, b) => a.title.localeCompare(b.title));

    return [...tasksWithDueDate, ...tasksWithoutDueDate].slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [tasks, currentPage]);

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
          projects={projects}
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
