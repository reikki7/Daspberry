import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";

export async function syncLocalTasksWithFirestore(
  localTasks,
  setLocalTasks,
  saveLocalTasks
) {
  try {
    const snapshot = await getDocs(collection(db, "Local Tasks"));
    const firestoreTasks = [];
    snapshot.forEach((docSnap) => {
      firestoreTasks.push({ id: docSnap.id, ...docSnap.data() });
    });

    const localMap = {};
    localTasks.forEach((task) => {
      localMap[task.id] = task;
    });

    const batch = writeBatch(db);

    // Sync from Firestore to local
    for (let remoteTask of firestoreTasks) {
      const localTask = localMap[remoteTask.id];
      if (!localTask) {
        // Task exists in Firestore but not locally
        localMap[remoteTask.id] = remoteTask;
      } else if (
        new Date(remoteTask.updated_at) > new Date(localTask.updated_at)
      ) {
        // Firestore task is newer
        localMap[remoteTask.id] = remoteTask;
      }
    }

    // Sync from local to Firestore
    const tasksToSync = Object.values(localMap);
    for (let task of tasksToSync) {
      const matchingFirestoreTask = firestoreTasks.find(
        (ft) => ft.id === task.id
      );

      if (!matchingFirestoreTask) {
        // Task exists locally but not in Firestore
        batch.set(doc(db, "Local Tasks", task.id), task);
      } else if (
        new Date(task.updated_at) > new Date(matchingFirestoreTask.updated_at)
      ) {
        // Local task is newer
        batch.set(doc(db, "Local Tasks", task.id), task);
      }
    }

    // Remove tasks from Firestore that are deleted locally
    for (let remoteTask of firestoreTasks) {
      if (!localMap[remoteTask.id]) {
        batch.delete(doc(db, "Local Tasks", remoteTask.id));
      }
    }

    // Commit batch operations
    await batch.commit();

    // Update local state and save
    const updatedTasks = tasksToSync.map((task) => ({
      ...task,
      pending_sync: false, // Mark all synced tasks
    }));

    setLocalTasks(updatedTasks);
    saveLocalTasks(updatedTasks);

    console.log("Sync complete!");
  } catch (error) {
    console.error("Error syncing tasks with Firestore:", error);
  }
}
