import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";

export async function syncLocalEventsWithFirestore(
  localEvents,
  setLocalEvents,
  saveLocalEvents
) {
  try {
    const snapshot = await getDocs(collection(db, "Local Events"));
    const firestoreEvents = [];
    snapshot.forEach((docSnap) => {
      firestoreEvents.push({ id: docSnap.id, ...docSnap.data() });
    });

    const localMap = {};
    localEvents.forEach((evt) => {
      localMap[evt.id] = evt;
    });

    const batch = writeBatch(db);

    // Pull changes from Firestore into local state
    for (let remoteEvt of firestoreEvents) {
      const localEvt = localMap[remoteEvt.id];
      if (!localEvt) {
        localMap[remoteEvt.id] = { ...remoteEvt, pending_sync: false }; // New from Firestore
      } else if (
        new Date(remoteEvt.updated_at) > new Date(localEvt.updated_at)
      ) {
        localMap[remoteEvt.id] = { ...remoteEvt, pending_sync: false }; // Overwrite with newer Firestore version
      }
    }

    // Push local changes to Firestore
    const newLocalEventsArray = Object.values(localMap);
    for (let localEvt of newLocalEventsArray) {
      const matchingFirestore = firestoreEvents.find(
        (fe) => fe.id === localEvt.id
      );

      if (!matchingFirestore) {
        batch.set(doc(db, "Local Events", localEvt.id), localEvt);
      } else if (
        new Date(localEvt.updated_at) > new Date(matchingFirestore.updated_at)
      ) {
        batch.set(doc(db, "Local Events", localEvt.id), localEvt);
      }
    }

    // Remove events from Firestore that were deleted locally
    for (let remoteEvt of firestoreEvents) {
      if (!localMap[remoteEvt.id]) {
        batch.delete(doc(db, "Local Events", remoteEvt.id));
      }
    }

    // Commit batch operations
    await batch.commit();

    // Update local state and save
    const syncedEvents = newLocalEventsArray.map((event) => ({
      ...event,
      pending_sync: false, // Mark synced events
    }));
    saveLocalEvents(syncedEvents);
    setLocalEvents(syncedEvents);

    console.log("Sync complete!");
  } catch (error) {
    console.error("Error syncing events with Firestore:", error);
  }
}
