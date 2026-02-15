// Gestion de la base de données IndexedDB - Générateur (version avec authentification)
class Database {
    static DB_NAME = 'QRGuardianGeneratorDB';
    static DB_VERSION = 6;
    static STORES = {
        KEYS: 'keys',
        HISTORY: 'scanHistory',
        GENERATIONS: 'generations',
        SETTINGS: 'settings',
        SECURITY_CODES: 'securityCodes',
        BATCHES: 'batches',
        USERS: 'users'
    };

    static async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;

                // Stores existants
                if (!db.objectStoreNames.contains(this.STORES.KEYS)) {
                    const keyStore = db.createObjectStore(this.STORES.KEYS, { keyPath: 'id' });
                    keyStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.STORES.HISTORY)) {
                    const historyStore = db.createObjectStore(this.STORES.HISTORY, { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                    historyStore.createIndex('valid', 'valid', { unique: false });
                    historyStore.createIndex('securityCode', 'securityCode', { unique: false });
                    historyStore.createIndex('eventId', 'eventId', { unique: false });
                    historyStore.createIndex('isDuplicate', 'isDuplicate', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.STORES.GENERATIONS)) {
                    const genStore = db.createObjectStore(this.STORES.GENERATIONS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    genStore.createIndex('timestamp', 'timestamp', { unique: false });
                    genStore.createIndex('securityCode', 'securityCode', { unique: false });
                    genStore.createIndex('used', 'used', { unique: false });
                    genStore.createIndex('eventId', 'eventId', { unique: false });
                    genStore.createIndex('batchIndex', 'batchIndex', { unique: false });
                    genStore.createIndex('batchTotal', 'batchTotal', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.STORES.SETTINGS)) {
                    const settingsStore = db.createObjectStore(this.STORES.SETTINGS, { keyPath: 'key' });
                    settingsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }

                if (!db.objectStoreNames.contains(this.STORES.SECURITY_CODES)) {
                    db.createObjectStore(this.STORES.SECURITY_CODES, { keyPath: 'code' });
                }

                if (!db.objectStoreNames.contains(this.STORES.BATCHES)) {
                    const batchesStore = db.createObjectStore(this.STORES.BATCHES, {
                        keyPath: 'batchId',
                        autoIncrement: true
                    });
                    batchesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    batchesStore.createIndex('count', 'count', { unique: false });
                    batchesStore.createIndex('securityCode', 'securityCode', { unique: false });
                }

                // Store pour les utilisateurs
                if (!db.objectStoreNames.contains(this.STORES.USERS)) {
                    const usersStore = db.createObjectStore(this.STORES.USERS, { keyPath: 'id' });
                    usersStore.createIndex('name', 'name', { unique: false });
                    usersStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    // ===== GESTION CENTRALISÉE DU CODE SECRET =====
    static async getSecurityCode() {
        const code = localStorage.getItem('qrguardian_security_code');
        if (code) {
            return code;
        }
        try {
            const dbCode = await this.getSetting('securityCode');
            if (dbCode) {
                localStorage.setItem('qrguardian_security_code', dbCode);
                return dbCode;
            }
        } catch (e) {}
        return null;
    }

    static async setSecurityCode(code) {
        if (!code) return;
        localStorage.setItem('qrguardian_security_code', code);
        try {
            await this.saveSetting('securityCode', code);
        } catch (e) {
            console.warn(' Sauvegarde DB du code secret échouée, mais localStorage OK');
        }
    }

    // ===== GÉNÉRATIONS =====
    static async saveGeneration(genData) {
        try {
            const db = await this.init();
            const tx = db.transaction(this.STORES.GENERATIONS, 'readwrite');
            const store = tx.objectStore(this.STORES.GENERATIONS);
            const genRecord = {
                ...genData,
                timestamp: new Date().toISOString(),
                used: genData.used || false,
                scanCount: genData.scanCount || 0
            };
            return new Promise((resolve, reject) => {
                const request = store.add(genRecord);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        } catch (error) {
            console.error(' Erreur saveGeneration:', error);
            throw error;
        }
    }

    // ===== PARAMÈTRES =====
    static async saveSetting(key, value) {
        try {
            const db = await this.init();
            const tx = db.transaction(this.STORES.SETTINGS, 'readwrite');
            const store = tx.objectStore(this.STORES.SETTINGS);
            const setting = { key, value, updatedAt: new Date().toISOString() };
            return new Promise((resolve, reject) => {
                const request = store.put(setting);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Erreur saveSetting:', error);
            throw error;
        }
    }

    static async getSetting(key) {
        try {
            const db = await this.init();
            const tx = db.transaction(this.STORES.SETTINGS, 'readonly');
            const store = tx.objectStore(this.STORES.SETTINGS);
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result?.value);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return null;
        }
    }

    // ===== GESTION DES UTILISATEURS (AUTH) =====
    static async saveUser(userData) {
        try {
            const db = await this.init();
            const tx = db.transaction(this.STORES.USERS, 'readwrite');
            const store = tx.objectStore(this.STORES.USERS);
            
            const user = {
                id: 'current_user',
                name: userData.name,
                pin: userData.pin,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            return new Promise((resolve, reject) => {
                const request = store.put(user);
                request.onsuccess = () => resolve(user);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Erreur saveUser:', error);
            throw error;
        }
    }

    static async getUser() {
        try {
            const db = await this.init();
            const tx = db.transaction(this.STORES.USERS, 'readonly');
            const store = tx.objectStore(this.STORES.USERS);
            return new Promise((resolve, reject) => {
                const request = store.get('current_user');
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Erreur getUser:', error);
            return null;
        }
    }

    static async deleteUser() {
        try {
            const db = await this.init();
            const tx = db.transaction(this.STORES.USERS, 'readwrite');
            const store = tx.objectStore(this.STORES.USERS);
            return new Promise((resolve, reject) => {
                const request = store.delete('current_user');
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Erreur deleteUser:', error);
            throw error;
        }
    }

    // ===== STATISTIQUES (simplifiées pour le générateur) =====
    static async getSecurityStats() {
        try {
            const db = await this.init();
            const tx = db.transaction(this.STORES.GENERATIONS, 'readonly');
            const store = tx.objectStore(this.STORES.GENERATIONS);
            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const codes = request.result;
                    resolve({
                        totalCodes: codes.length,
                        usedCodes: codes.filter(c => c.used).length,
                        duplicateAttempts: 0,
                        fraudRate: '0%'
                    });
                };
                request.onerror = () => resolve({ totalCodes: 0, usedCodes: 0, duplicateAttempts: 0, fraudRate: '0%' });
            });
        } catch (error) {
            console.error('Erreur getSecurityStats:', error);
            return { totalCodes: 0, usedCodes: 0, duplicateAttempts: 0, fraudRate: '0%' };
        }
    }

    // ===== LOTS =====
    static async saveBatch(batchData) {
        try {
            const db = await this.init();
            const tx = db.transaction(this.STORES.BATCHES, 'readwrite');
            const store = tx.objectStore(this.STORES.BATCHES);
            const batchRecord = {
                ...batchData,
                timestamp: new Date().toISOString(),
                status: 'completed',
                completedAt: new Date().toISOString()
            };
            return new Promise((resolve, reject) => {
                const request = store.add(batchRecord);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        } catch (error) {
            console.error('Erreur saveBatch:', error);
            throw error;
        }
    }

    // ===== NETTOYAGE =====
    static async clearAll() {
        try {
            const db = await this.init();
            const stores = Object.values(this.STORES).filter(s => s !== this.STORES.SETTINGS);
            for (const storeName of stores) {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                await new Promise((resolve, reject) => {
                    const request = store.clear();
                    request.onsuccess = resolve;
                    request.onerror = reject;
                });
            }
            return true;
        } catch (error) {
            console.error(' Erreur clearAll:', error);
            throw error;
        }
    }
}

// Exposition globale
if (typeof window !== 'undefined') {
    window.Database = Database;
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await Database.init();
        } catch (error) {
            console.error(' Erreur initialisation DB:', error);
        }
    }, 500);
});