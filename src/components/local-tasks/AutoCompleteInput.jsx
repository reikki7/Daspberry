import { useState, useRef, useEffect, Fragment } from "react";
import { X, ChevronDown } from "lucide-react";

export default function AutocompleteInput({
  value,
  onChange,
  projects = [],
  placeholder = "No Project Set",
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const [searchValue, setSearchValue] = useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [currentMonth, setCurrentMonth] = useState("");

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setSearchValue(value || "");
  }, [value]);

  const isExactMatch = projects.some(
    (p) => p.toLowerCase() === searchValue.trim().toLowerCase()
  );

  const filteredProjects = projects.filter((p) =>
    p.toLowerCase().includes(searchValue.toLowerCase())
  );

  const createLabel = searchValue.trim()
    ? `Create a new project: "${searchValue.trim()}"`
    : `Create a new project:`;

  let combinedProjects = [];
  if (searchValue.trim()) {
    if (!isExactMatch) {
      combinedProjects = [createLabel, ...filteredProjects];
    } else {
      combinedProjects = filteredProjects;
    }
  } else {
    combinedProjects = [createLabel, ...filteredProjects];
  }

  const displayedProjects = showAllProjects ? projects : combinedProjects;

  // Close the dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
        setShowAllProjects(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setSearchValue(e.target.value);
    onChange?.(e.target.value);

    setShowDropdown(true);
    setShowAllProjects(false);
  };

  const handleSelectProject = (project) => {
    setSearchValue(project);
    onChange?.(project);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setShowAllProjects(false);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown && e.key === "ArrowDown") {
      setShowDropdown(true);
      setHighlightedIndex(-1);
      setShowAllProjects(false);
      return;
    }

    if (showDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prevIndex) =>
          prevIndex < displayedProjects.length - 1 ? prevIndex + 1 : prevIndex
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : -1
        );
      } else if (e.key === "Enter") {
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < displayedProjects.length
        ) {
          e.preventDefault();
          const firstItemIsCreate = displayedProjects[0]?.startsWith(
            "Create a new project:"
          );
          if (highlightedIndex === 0 && firstItemIsCreate) {
            // User selected the "Create" item
            handleSelectProject(searchValue.trim());
          } else {
            handleSelectProject(displayedProjects[highlightedIndex]);
          }
        } else {
          setShowDropdown(false);
          setShowAllProjects(false);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlightedIndex(-1);
        setShowAllProjects(false);
      }
    }
  };

  const handleBlur = () => {
    // If user typed something, treat it as creating a new project
    if (searchValue.trim()) {
      handleSelectProject(searchValue.trim());
    } else {
      setShowDropdown(false);
      setShowAllProjects(false);
    }
  };

  // Example date-positions logic from your code
  const datePositions = [
    { month: "", position: "left-[417px]" },
    { month: "January", position: "left-[456px]" },
    { month: "February", position: "left-[461px]" },
    { month: "March", position: "left-[445px]" },
    { month: "April", position: "left-[434px]" },
    { month: "May", position: "left-[432px]" },
    { month: "June", position: "left-[438px]" },
    { month: "July", position: "left-[433px]" },
    { month: "August", position: "left-[452px]" },
    { month: "September", position: "left-[476px]" },
    { month: "October", position: "left-[458px]" },
    { month: "November", position: "left-[473px]" },
    { month: "December", position: "left-[472px]" },
  ];

  useEffect(() => {
    const month = new Date().toLocaleString("default", { month: "long" });
    setCurrentMonth(month);
  }, []);

  const currentPosition =
    datePositions.find((d) => d.month === currentMonth)?.position ||
    "left-[418px]";

  const toggleDropdownAllProjects = () => {
    setShowDropdown((prev) => !prev);
    setShowAllProjects((prev) => !prev);
    setHighlightedIndex(-1);
  };

  return (
    <div className="w-full" ref={dropdownRef}>
      <div className="w-full relative">
        <input
          ref={inputRef}
          type="text"
          className="w-64 bg-white/5 text-white p-2 rounded-lg border border-white/10 focus:outline-none focus:border-white/30"
          placeholder={placeholder}
          value={searchValue}
          onChange={handleChange}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        <div className="absolute right-1.5 top-1 z-[999] text-white items-center flex gap-1">
          {searchValue && (
            <button
              className="mr-2"
              onClick={() => {
                onChange("");
                setSearchValue("");
                setShowAllProjects(false);
              }}
              aria-label="Clear input"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
          <button
            className="text-white p-2 border-l border-white/20"
            onClick={toggleDropdownAllProjects}
          >
            <ChevronDown
              className={`ml-1 ${
                showDropdown ? "rotate-180" : "rotate-0"
              } duration-300`}
              size={15}
            />
          </button>
        </div>
      </div>

      {/* The dropdown */}
      {showDropdown && displayedProjects.length > 0 && (
        <ul
          className="absolute w-[255px] mt-1 z-50 bg-[#0B0F1C] border border-cyan-400/20 rounded-lg shadow-lg"
          style={{
            maxHeight: "200px",
            overflowY: "auto",
            left: currentPosition,
          }}
        >
          {displayedProjects.map((proj, index) => {
            const isHighlighted = index === highlightedIndex;

            if (
              index === 1 &&
              displayedProjects[0]?.startsWith("Create a new project:") &&
              displayedProjects.length > 1
            ) {
              return (
                <Fragment key={proj}>
                  {/* Divider */}
                  <li className="border-b border-gray-600/50 my-1 mx-2" />
                  <li
                    onMouseDown={() => {
                      const firstItemIsCreate =
                        displayedProjects[0]?.startsWith(
                          "Create a new project:"
                        );
                      if (index === 0 && firstItemIsCreate) {
                        handleSelectProject(searchValue.trim());
                      } else {
                        handleSelectProject(proj);
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-4 py-2 cursor-pointer ${
                      isHighlighted
                        ? "bg-cyan-700/30 text-white"
                        : "bg-[#0B0F1C] hover:bg-[#1E2A3A] text-gray-100"
                    }`}
                  >
                    {proj}
                  </li>
                </Fragment>
              );
            }

            // Normal items (including the "Create" item if it's index 0)
            return (
              <li
                key={proj}
                onMouseDown={() => {
                  const firstItemIsCreate = displayedProjects[0]?.startsWith(
                    "Create a new project:"
                  );
                  if (index === 0 && firstItemIsCreate) {
                    handleSelectProject(searchValue.trim());
                  } else {
                    handleSelectProject(proj);
                  }
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-2 cursor-pointer ${
                  isHighlighted
                    ? "bg-cyan-700/30 text-white"
                    : "bg-[#0B0F1C] hover:bg-[#1E2A3A] text-gray-100"
                }`}
              >
                {proj}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
