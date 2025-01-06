import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";

// Keep track of deleted tasks with timestamps
const DELETED_TASKS_COLLECTION = "Deleted Tasks";

export async function syncLocalTasksWithFirestore(
  localTasks,
  setLocalTasks,
  saveLocalTasks
) {
  try {
    // Get all current tasks from Firestore
    const snapshot = await getDocs(collection(db, "Local Tasks"));
    const firestoreTasks = [];
    snapshot.forEach((docSnap) => {
      firestoreTasks.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Get deleted tasks tracking information
    const deletedSnapshot = await getDocs(
      collection(db, DELETED_TASKS_COLLECTION)
    );
    const deletedTasks = new Map();
    deletedSnapshot.forEach((doc) => {
      deletedTasks.set(doc.id, doc.data().deleted_at);
    });

    const localMap = new Map();
    localTasks.forEach((task) => {
      localMap.set(task.id, task);
    });

    const batch = writeBatch(db);

    // Check for tasks that were deleted on other devices
    for (const [taskId, deletedAt] of deletedTasks) {
      const localTask = localMap.get(taskId);
      if (localTask) {
        // If task exists locally but was deleted elsewhere
        const localUpdateTime = new Date(localTask.updated_at || 0);
        const deleteTime = new Date(deletedAt);

        if (deleteTime > localUpdateTime) {
          // Delete was more recent than local update
          localMap.delete(taskId);
        } else {
          // Local update was more recent, remove from deleted tracking
          batch.delete(doc(db, DELETED_TASKS_COLLECTION, taskId));
        }
      }
    }

    // Sync from Firestore to local
    for (const remoteTask of firestoreTasks) {
      const localTask = localMap.get(remoteTask.id);
      if (!localTask) {
        // New task from Firestore
        if (!deletedTasks.has(remoteTask.id)) {
          localMap.set(remoteTask.id, remoteTask);
        }
      } else {
        // Compare timestamps for existing tasks
        const remoteTime = new Date(remoteTask.updated_at || 0);
        const localTime = new Date(localTask.updated_at || 0);

        if (remoteTime > localTime) {
          localMap.set(remoteTask.id, remoteTask);
        }
      }
    }

    // Sync from local to Firestore
    const tasksToSync = Array.from(localMap.values());
    for (const task of tasksToSync) {
      const matchingFirestoreTask = firestoreTasks.find(
        (ft) => ft.id === task.id
      );

      if (!matchingFirestoreTask) {
        // New local task
        if (!deletedTasks.has(task.id)) {
          batch.set(doc(db, "Local Tasks", task.id), task);
        }
      } else {
        // Compare timestamps for existing tasks
        const localTime = new Date(task.updated_at || 0);
        const remoteTime = new Date(matchingFirestoreTask.updated_at || 0);

        if (localTime > remoteTime) {
          batch.set(doc(db, "Local Tasks", task.id), task);
        }
      }
    }

    // Handle local deletions
    const localIds = new Set(tasksToSync.map((t) => t.id));
    for (const remoteTask of firestoreTasks) {
      if (!localIds.has(remoteTask.id) && !deletedTasks.has(remoteTask.id)) {
        // Task was deleted locally, track it
        batch.delete(doc(db, "Local Tasks", remoteTask.id));
        batch.set(doc(db, DELETED_TASKS_COLLECTION, remoteTask.id), {
          deleted_at: new Date().toISOString(),
        });
      }
    }

    // Commit all changes
    await batch.commit();

    // Update local state
    const updatedTasks = tasksToSync.map((task) => ({
      ...task,
      pending_sync: false,
    }));

    setLocalTasks(updatedTasks);
    await saveLocalTasks(updatedTasks);

    console.log("Sync complete with deletion handling!");
  } catch (error) {
    console.error("Error syncing tasks with Firestore:", error);
    throw error;
  }
}
