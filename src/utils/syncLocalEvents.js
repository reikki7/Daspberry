import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
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
      firestoreEvents.push(docSnap.data());
    });

    const localMap = {};
    localEvents.forEach((evt) => {
      localMap[evt.id] = evt;
    });

    // Pull in changes from Firestore into local
    for (let remoteEvt of firestoreEvents) {
      const localEvt = localMap[remoteEvt.id];
      if (!localEvt) {
        // Firestore event doesn't exist locally -> add it
        localMap[remoteEvt.id] = remoteEvt;
      } else {
        // Compare updated_at timestamps
        if (new Date(remoteEvt.updated_at) > new Date(localEvt.updated_at)) {
          localMap[remoteEvt.id] = remoteEvt; // Firestore is newer -> overwrite
        }
      }
    }

    // Push local changes up to Firestore
    const newLocalEventsArray = Object.values(localMap);

    for (let localEvt of newLocalEventsArray) {
      const matchingFirestore = firestoreEvents.find(
        (fe) => fe.id === localEvt.id
      );
      if (!matchingFirestore) {
        // Firestore doesn’t have it -> create doc
        await setDoc(doc(db, "Local Events", localEvt.id), localEvt);
      } else {
        // Compare timestamps
        if (
          new Date(localEvt.updated_at) > new Date(matchingFirestore.updated_at)
        ) {
          await setDoc(doc(db, "Local Events", localEvt.id), localEvt);
        }
      }
    }

    // Remove events in Firestore that were deleted locally
    for (let remoteEvt of firestoreEvents) {
      const localEvt = localMap[remoteEvt.id];
      if (!localEvt) {
        await deleteDoc(doc(db, "Local Events", remoteEvt.id));
      }
    }

    // Update local state + local save
    saveLocalEvents(newLocalEventsArray);
    setLocalEvents(newLocalEventsArray);
  } catch (error) {
    console.error("Error syncing events with Firestore:", error);
  }
}
