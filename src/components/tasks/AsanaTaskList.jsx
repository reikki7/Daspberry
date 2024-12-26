import { CalendarIcon } from "lucide-react";
import { ScaleLoader } from "react-spinners";
import { formatDistanceToNow } from "date-fns";

const AsanaTaskList = ({
  tasks,
  handleTaskClick,
  loading,
  replaceProfileLinks,
}) => {
  return (
    <div className="flex w-full flex-col gap-3">
      {tasks?.length > 0 && !loading ? (
        tasks?.map((task) => (
          <button
            key={task?.gid}
            className="group bg-gray-950/30 border border-white/10 backdrop-blur-md text-left p-4 rounded-lg shadow-md 
                 hover:shadow-xl transition-all duration-100 ease-in-out relative overflow-hidden"
            onClick={() => handleTaskClick(task)}
          >
            {/* Hover gradient overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 
                    group-hover:opacity-100 transition-opacity duration-100 ease-in-out"
            />

            {/* Content container - needs relative positioning to stay above gradient */}
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-white line-clamp-2 truncate">
                  {task?.name}
                </h3>
                <div className="flex items-center gap-3">
                  {task?.followers?.map((follower) => (
                    <div
                      key={follower?.gid}
                      className="text-xs text-white bg-cyan-500/10 border border-white/10 rounded-full px-3 py-1"
                    >
                      {follower?.name}
                    </div>
                  ))}
                  {(() => {
                    if (!task.due_on) return null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(task.due_on);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate < today ? (
                      <div className="bg-red-500/10 text-red-400 px-2 py-1 rounded-full text-xs">
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

              <div className="text-sm text-white mt-2 line-clamp-3 whitespace-pre-wrap">
                {replaceProfileLinks(task.notes)}
              </div>
            </div>
          </button>
        ))
      ) : (
        <div className="flex items-center justify-center mt-20">
          <ScaleLoader color="#8dccff" />
        </div>
      )}
    </div>
  );
};

export default AsanaTaskList;
