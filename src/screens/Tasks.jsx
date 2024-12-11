import React, { useState } from "react";
import LocalTasks from "../components/LocalTasks";
import AsanaTasks from "../components/AsanaTasks";

const Tasks = () => {
  const [isTaskAvailable, setIsTaskAvailable] = useState(false);
  return (
    <div data-tauri-drag-region className="h-full pr-3">
      <div>
        <LocalTasks setIsTaskAvailable={setIsTaskAvailable} />
      </div>
      <div className="mt-2 ">
        <AsanaTasks isTaskAvailable={isTaskAvailable} />
      </div>
    </div>
  );
};

export default Tasks;
