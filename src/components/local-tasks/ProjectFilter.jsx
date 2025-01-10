import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const ProjectFilter = ({ tasks, onFilterChange, setCurrentPage }) => {
  const [selectedProject, setSelectedProject] = useState("all");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const projects = useMemo(() => {
    const incompleteTasks = tasks.filter((t) => !t.completed);
    const onlyUnassigned = incompleteTasks.every(
      (t) => !t.project || t.project === ""
    );

    if (onlyUnassigned) {
      return ["all"];
    }

    const uniqueProjects = [
      ...new Set(incompleteTasks.map((t) => t.project || "Unassigned")),
    ];

    return [
      "all",
      ...uniqueProjects.filter((p) => p !== "Unassigned").sort(),
      "Unassigned",
    ];
  }, [tasks]);

  const handleProjectChange = (project) => {
    setSelectedProject(project);
    setCurrentPage(1);
    onFilterChange(project);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const incompleteTasks = tasks.filter((task) => !task.completed);
    const selectedProjectTasks =
      selectedProject === "all"
        ? incompleteTasks
        : incompleteTasks.filter((task) =>
            selectedProject === "Unassigned"
              ? !task.project || task.project === ""
              : task.project === selectedProject
          );

    if (selectedProject !== "all" && selectedProjectTasks.length === 0) {
      setSelectedProject("all");
      setCurrentPage(1);
      onFilterChange("all");
    }
  }, [tasks, selectedProject, onFilterChange, setCurrentPage]);

  const getDisplayText = (project) => {
    if (project === "all") return "All Projects";
    return project;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-1.5 bg-purple-500/20 text-white rounded-lg shadow-sm hover:bg-purple-500/40 transition-all duration-300 text-sm font-medium min-w-[140px] justify-between"
      >
        <span>{getDisplayText(selectedProject)}</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-purple-900/40 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-auto">
            {projects.map((project) => (
              <button
                key={project}
                onClick={() => handleProjectChange(project)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-purple-700/50 transition-colors duration-200 ${
                  project === selectedProject
                    ? "bg-purple-700/40 text-white"
                    : "text-gray-200"
                }`}
              >
                {getDisplayText(project)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFilter;
