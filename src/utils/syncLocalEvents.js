import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";

const DELETED_EVENTS_COLLECTION = "Deleted Events";

export async function syncLocalEventsWithFirestore(
  localEvents,
  setLocalEvents,
  saveLocalEvents
) {
  try {
    // Get all current events from Firestore
    const snapshot = await getDocs(collection(db, "Local Events"));
    const firestoreEvents = [];
    snapshot.forEach((docSnap) => {
      firestoreEvents.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Get deleted events tracking information
    const deletedSnapshot = await getDocs(
      collection(db, DELETED_EVENTS_COLLECTION)
    );
    const deletedEvents = new Map();
    deletedSnapshot.forEach((doc) => {
      deletedEvents.set(doc.id, doc.data().deleted_at);
    });

    const localMap = new Map();
    localEvents.forEach((event) => {
      localMap.set(event.id, event);
    });

    const batch = writeBatch(db);

    // Check for events that were deleted on other devices
    for (const [eventId, deletedAt] of deletedEvents) {
      const localEvent = localMap.get(eventId);
      if (localEvent) {
        const localUpdateTime = new Date(localEvent.updated_at || 0);
        const deleteTime = new Date(deletedAt);

        if (deleteTime > localUpdateTime) {
          // Delete was more recent than local update
          localMap.delete(eventId);
        } else {
          // Local update was more recent, remove from deleted tracking
          batch.delete(doc(db, DELETED_EVENTS_COLLECTION, eventId));
        }
      }
    }

    // Sync from Firestore to local
    for (const remoteEvent of firestoreEvents) {
      const localEvent = localMap.get(remoteEvent.id);
      if (!localEvent) {
        // New event from Firestore
        if (!deletedEvents.has(remoteEvent.id)) {
          localMap.set(remoteEvent.id, remoteEvent);
        }
      } else {
        const remoteTime = new Date(remoteEvent.updated_at || 0);
        const localTime = new Date(localEvent.updated_at || 0);

        if (remoteTime > localTime) {
          localMap.set(remoteEvent.id, remoteEvent);
        }
      }
    }

    // Sync from local to Firestore
    const eventsToSync = Array.from(localMap.values());
    for (const event of eventsToSync) {
      const matchingFirestoreEvent = firestoreEvents.find(
        (fe) => fe.id === event.id
      );

      if (!matchingFirestoreEvent) {
        // New local event
        if (!deletedEvents.has(event.id)) {
          batch.set(doc(db, "Local Events", event.id), event);
        }
      } else {
        const localTime = new Date(event.updated_at || 0);
        const remoteTime = new Date(matchingFirestoreEvent.updated_at || 0);

        if (localTime > remoteTime) {
          batch.set(doc(db, "Local Events", event.id), event);
        }
      }
    }

    // Handle local deletions
    const localIds = new Set(eventsToSync.map((e) => e.id));
    for (const remoteEvent of firestoreEvents) {
      if (!localIds.has(remoteEvent.id) && !deletedEvents.has(remoteEvent.id)) {
        // Event was deleted locally, track it
        batch.delete(doc(db, "Local Events", remoteEvent.id));
        batch.set(doc(db, DELETED_EVENTS_COLLECTION, remoteEvent.id), {
          deleted_at: new Date().toISOString(),
        });
      }
    }

    // Commit all changes
    await batch.commit();

    // Update local state
    const updatedEvents = eventsToSync.map((event) => ({
      ...event,
      pending_sync: false,
    }));

    setLocalEvents(updatedEvents);
    await saveLocalEvents(updatedEvents);
  } catch (error) {
    console.error("Error syncing events with Firestore:", error);
    throw error;
  }
}
