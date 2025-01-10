import { useState } from "react";

const CustomDropdown = ({
  assignees = [],
  selectedAssignee,
  setSelectedAssignee,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSelect = (gid) => {
    setSelectedAssignee(gid);
    setIsOpen(false);
  };

  const filteredAssignees = assignees.filter((assignee) =>
    assignee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left w-56">
      {/* Trigger Button */}
      <div>
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev), setSearchTerm("");
          }}
          className="inline-flex w-full justify-between items-center bg-gray-950/40 text-white rounded-lg px-4 py-2 pr-10 border border-gray-600 hover:border-cyan-400 duration-500 focus:outline-none focus:ring-2 focus:ring-white"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="truncate">
            {assignees.length > 0
              ? assignees.find((a) => a.gid === selectedAssignee)?.name ||
                "Select Assignee"
              : "No Assignees"}
          </span>

          <svg
            className={`absolute right-4 h-5 w-5 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-gray-950/70 text-white rounded-lg shadow-lg max-h-60 overflow-auto focus:outline-none">
          {/* Search Bar */}
          <div className="p-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search..."
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          {/* Filtered List */}
          {filteredAssignees.length > 0 ? (
            filteredAssignees.map((assignee) => (
              <li
                key={assignee.gid}
                role="option"
                className="px-4 py-2 hover:bg-cyan-500/50 hover:text-white cursor-pointer"
                onClick={() => handleSelect(assignee.gid)}
              >
                {assignee.name}
              </li>
            ))
          ) : (
            <div className="px-4 py-2">No matching assignees</div>
          )}
        </div>
      )}

      {/* No Assignees Message */}
      {isOpen && assignees.length === 0 && (
        <div className="absolute z-10 mt-2 w-full bg-gray-800 text-white rounded-lg shadow-lg px-4 py-2">
          No assignees available
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
