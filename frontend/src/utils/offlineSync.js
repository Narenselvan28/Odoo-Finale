/**
 * DealFlow360 - Local-First Architecture & Offline Sync Manager
 * Provides:
 * - Persistent local draft storage for quotations and negotiations
 * - Optimistic local-first updates
 * - Background queue to sync mutations when connection is restored
 */

const STORAGE_KEY_PREFIX = "dealflow_local_";
const SYNC_QUEUE_KEY = "dealflow_sync_queue";

export const LocalFirstManager = {
  // Save local draft
  saveDraft: (dealId, draftData) => {
    try {
      const payload = {
        ...draftData,
        lastSaved: new Date().toISOString(),
        isLocalOnly: true,
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${dealId}`, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn("Local draft storage failed:", e);
      return false;
    }
  },

  // Retrieve local draft
  getDraft: (dealId) => {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${dealId}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // Clear local draft
  clearDraft: (dealId) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${dealId}`);
  },

  // Enqueue offline action
  enqueueAction: (actionType, payload) => {
    try {
      const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]");
      queue.push({
        id: `act_${Date.now()}`,
        actionType,
        payload,
        createdAt: new Date().toISOString(),
        retryCount: 0,
      });
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to enqueue offline action:", e);
    }
  },

  // Process sync queue
  flushQueue: async (apiExecutor) => {
    try {
      const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]");
      if (queue.length === 0) return { synced: 0, pending: 0 };

      const remaining = [];
      let syncedCount = 0;

      for (const item of queue) {
        try {
          await apiExecutor(item.actionType, item.payload);
          syncedCount++;
        } catch (err) {
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount < 5) {
            remaining.push(item);
          }
        }
      }

      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
      return { synced: syncedCount, pending: remaining.length };
    } catch (e) {
      return { synced: 0, pending: 0 };
    }
  },
};

export default LocalFirstManager;
