

import { RepoInfo, FileNode, RagChunk, KnowledgeGraph, ChatSession, Bookmark } from '../types';

const DB_NAME = 'GitChatDB';
/**
 * Database version history:
 * - v1: Initial version with repositories store
 * - v2: Added chat_sessions store for conversation history
 * - v3: Added bookmarks store for message bookmarking feature
 * Note: IndexedDB handles version upgrades automatically via onupgradeneeded
 */
const DB_VERSION = 3;

interface CachedRepoData {
  repoId: string; // owner/repo
  info: RepoInfo;
  tree: FileNode[];
  chunks: RagChunk[];
  graph: KnowledgeGraph | null;
  timestamp: number;
}

class DBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store for Repository Data (One entry per repo)
        if (!db.objectStoreNames.contains('repositories')) {
          db.createObjectStore('repositories', { keyPath: 'repoId' });
        }

        // Store for Chat Sessions
        if (!db.objectStoreNames.contains('chat_sessions')) {
           const chatStore = db.createObjectStore('chat_sessions', { keyPath: 'id' });
           chatStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // Store for Bookmarks
        if (!db.objectStoreNames.contains('bookmarks')) {
           const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
           bookmarkStore.createIndex('sessionId', 'sessionId', { unique: false });
           bookmarkStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // --- Repo Cache Methods ---

  async saveRepoData(repoId: string, data: Omit<CachedRepoData, 'timestamp' | 'repoId'>): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['repositories'], 'readwrite');
      const store = transaction.objectStore('repositories');
      
      const record: CachedRepoData = {
        repoId,
        timestamp: Date.now(),
        ...data
      };

      const request = store.put(record);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRepoData(repoId: string): Promise<CachedRepoData | undefined> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['repositories'], 'readonly');
      const store = transaction.objectStore('repositories');
      const request = store.get(repoId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCachedRepos(): Promise<RepoInfo[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['repositories'], 'readonly');
      const store = transaction.objectStore('repositories');
      const request = store.getAll();

      request.onsuccess = () => {
        const results: CachedRepoData[] = request.result;
        resolve(results.map(r => r.info));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRepo(repoId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['repositories'], 'readwrite');
        const store = transaction.objectStore('repositories');
        const request = store.delete(repoId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  }

  // --- Chat Session Methods ---

  async saveChatSession(session: ChatSession): Promise<void> {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(['chat_sessions'], 'readwrite');
          const store = transaction.objectStore('chat_sessions');
          const request = store.put(session);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(['chat_sessions'], 'readonly');
          const store = transaction.objectStore('chat_sessions');
          const index = store.index('lastUpdated');
          // Get stored sessions (openCursor for reverse order is also an option, but getAll + reverse JS is fine for small lists)
          const request = index.getAll();
          
          request.onsuccess = () => {
              const sessions = request.result as ChatSession[];
              resolve(sessions.reverse()); // Newest first
          };
          request.onerror = () => reject(request.error);
      });
  }

  async deleteChatSession(id: string): Promise<void> {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(['chat_sessions'], 'readwrite');
          const store = transaction.objectStore('chat_sessions');
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  // --- Bookmark Methods ---

  async saveBookmark(bookmark: Bookmark): Promise<void> {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(['bookmarks'], 'readwrite');
          const store = transaction.objectStore('bookmarks');
          const request = store.put(bookmark);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }

  async getAllBookmarks(): Promise<Bookmark[]> {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(['bookmarks'], 'readonly');
          const store = transaction.objectStore('bookmarks');
          const index = store.index('timestamp');
          const request = index.getAll();
          
          request.onsuccess = () => {
              const bookmarks = request.result as Bookmark[];
              resolve(bookmarks.reverse()); // Newest first
          };
          request.onerror = () => reject(request.error);
      });
  }

  async getBookmarksBySession(sessionId: string): Promise<Bookmark[]> {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(['bookmarks'], 'readonly');
          const store = transaction.objectStore('bookmarks');
          const index = store.index('sessionId');
          const request = index.getAll(sessionId);
          
          request.onsuccess = () => {
              resolve(request.result as Bookmark[]);
          };
          request.onerror = () => reject(request.error);
      });
  }

  async deleteBookmark(id: string): Promise<void> {
      if (!this.db) await this.init();

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(['bookmarks'], 'readwrite');
          const store = transaction.objectStore('bookmarks');
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      });
  }
}

export const dbService = new DBService();