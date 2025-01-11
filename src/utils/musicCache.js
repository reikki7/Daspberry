// cache.js
let metadataCache = new Map();

// Initialize IndexedDB
export const initDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MusicPlayerDB", 2);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("metadata")) {
        const store = db.createObjectStore("metadata", { keyPath: "path" });
        store.createIndex("timestamp", "timestamp");
      }
      // Add store for album art blobs
      if (!db.objectStoreNames.contains("albumArt")) {
        db.createObjectStore("albumArt", { keyPath: "path" });
      }
    };
  });
};

// Get metadata and album art from IndexedDB
export const getMetadataFromCache = async (filePath, fileSize) => {
  if (metadataCache.has(filePath)) return metadataCache.get(filePath);

  try {
    const db = await initDB();
    const transaction = db.transaction(["metadata", "albumArt"], "readonly");

    const metadataStore = transaction.objectStore("metadata");
    const albumArtStore = transaction.objectStore("albumArt");

    const [metadata, albumArt] = await Promise.all([
      new Promise((resolve) => {
        const request = metadataStore.get(filePath);
        request.onsuccess = () => resolve(request.result);
      }),
      new Promise((resolve) => {
        const request = albumArtStore.get(filePath);
        request.onsuccess = () => resolve(request.result);
      }),
    ]);

    if (
      metadata &&
      metadata.fileSize === fileSize &&
      Date.now() - metadata.timestamp < 7 * 24 * 60 * 60 * 1000
    ) {
      const result = {
        metadata: metadata.metadata,
        albumArtBlob: albumArt?.blob || null,
      };
      metadataCache.set(filePath, result);
      return result;
    }
    return null; // Data is outdated or missing
  } catch (error) {
    console.error("Error reading from IndexedDB:", error);
    return null;
  }
};

// Remove metadata and album art from IndexedDB
export const removeFromCache = async (filePath) => {
  try {
    const db = await initDB();
    const transaction = db.transaction(["metadata", "albumArt"], "readwrite");

    const metadataStore = transaction.objectStore("metadata");
    const albumArtStore = transaction.objectStore("albumArt");

    metadataStore.delete(filePath);
    albumArtStore.delete(filePath);

    transaction.onerror = () => {
      console.error("Error removing from cache:", transaction.error);
    };
  } catch (error) {
    console.error("Error removing file from cache:", error);
  }
};

export const getAllCachedFiles = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction(["metadata", "albumArt"], "readonly");
    const metadataStore = transaction.objectStore("metadata");
    const albumArtStore = transaction.objectStore("albumArt");

    return new Promise((resolve, reject) => {
      const request = metadataStore.getAll();
      request.onsuccess = async () => {
        const allMetadata = request.result;
        const processedFiles = await Promise.all(
          allMetadata.map(async (metadataEntry) => {
            const albumArtRequest = albumArtStore.get(metadataEntry.path);
            const albumArtResult = await new Promise((res) => {
              albumArtRequest.onsuccess = () => res(albumArtRequest.result);
            });
            return {
              path: metadataEntry.path,
              metadata: metadataEntry.metadata,
              size: metadataEntry.fileSize,
              albumArtBlob: albumArtResult?.blob || null,
            };
          })
        );
        resolve(processedFiles);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error getting all cached files:", error);
    return [];
  }
};

export const clearCache = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction(["metadata", "albumArt"], "readwrite");

    const metadataStore = transaction.objectStore("metadata");
    const albumArtStore = transaction.objectStore("albumArt");

    await Promise.all([
      new Promise((resolve, reject) => {
        const reqMeta = metadataStore.clear();
        reqMeta.onsuccess = resolve;
        reqMeta.onerror = reject;
      }),
      new Promise((resolve, reject) => {
        const reqArt = albumArtStore.clear();
        reqArt.onsuccess = resolve;
        reqArt.onerror = reject;
      }),
    ]);

    // Also clear the in-memory cache
    metadataCache.clear();
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

// Modified saveMetadataToCache to handle empty metadata better
export const saveMetadataToCache = async (filePath, metadata, albumArtBlob) => {
  try {
    const db = await initDB();
    const transaction = db.transaction(["metadata", "albumArt"], "readwrite");

    // Ensure metadata has at least basic structure
    const processedMetadata = {
      title:
        metadata?.title ||
        filePath
          .split("\\")
          .pop()
          .replace(/\.[^/.]+$/, ""),
      artist: metadata?.artist || "Unknown Artist",
      album: metadata?.album || "Unknown Album",
      ...metadata,
    };

    // Save metadata
    const metadataStore = transaction.objectStore("metadata");
    await metadataStore.put({
      path: filePath,
      metadata: processedMetadata,
      timestamp: Date.now(),
      fileSize: metadata?.size || 0,
    });

    // Save album art if exists
    if (albumArtBlob) {
      const albumArtStore = transaction.objectStore("albumArt");
      await albumArtStore.put({
        path: filePath,
        blob: albumArtBlob,
        timestamp: Date.now(),
      });
    }

    // Update in-memory cache
    metadataCache.set(filePath, {
      metadata: processedMetadata,
      albumArtBlob: albumArtBlob,
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Error saving to cache:", error);
  }
};
