import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const ProjectFilter = ({ tasks, onFilterChange, setCurrentPage }) => {
  const [selectedProject, setSelectedProject] = useState("all");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const projects = useMemo(() => {
    const uniqueProjects = [
      ...new Set(
        tasks.filter((t) => !t.completed).map((t) => t.project || "Unassigned")
      ),
    ];

    // Sort projects: "all" first, actual projects alphabetically, "Unassigned" last
    return [
      "all",
      ...uniqueProjects.filter((p) => p !== "Unassigned").sort(),
      "Unassigned",
    ];
  }, [tasks]);

  // In your ProjectFilter component, modify the handleProjectChange function:
  const handleProjectChange = (project) => {
    setSelectedProject(project);
    setCurrentPage(1); // Reset to first page when changing filters
    onFilterChange(project);
    setIsOpen(false);
  };

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
