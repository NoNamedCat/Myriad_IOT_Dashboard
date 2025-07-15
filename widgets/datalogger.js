// libs/datalogger.js

const DB_PREFIX = 'myriad_log_';

// Clase para gestionar el logging de un widget específico
class WidgetLogger {
    constructor(widgetId, limitKB = 50) {
        this.storageKey = `${DB_PREFIX}${widgetId}`;
        this.limitBytes = limitKB * 1024;
        this.records = this._load();
    }

    _load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error loading logs for ${this.widgetId}:`, e);
            return [];
        }
    }

    _save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.records));
        } catch (e) {
            console.error(`Error saving logs for ${this.widgetId}:`, e);
        }
    }

    log(data) {
        this.records.push({ ts: Date.now(), payload: data });
        this._enforceLimit();
        this._save();
    }

    getLogs() {
        return this.records;
    }

    getUsage() {
        const usageBytes = localStorage.getItem(this.storageKey)?.length || 0;
        return (usageBytes / 1024).toFixed(2); // Retorna uso en KB
    }

    clear() {
        this.records = [];
        localStorage.removeItem(this.storageKey);
    }
    
    setLimit(limitKB) {
        this.limitBytes = limitKB * 1024;
        this._enforceLimit();
        this._save();
    }

    _enforceLimit() {
        let currentSize = JSON.stringify(this.records).length;
        while (currentSize > this.limitBytes && this.records.length > 0) {
            this.records.shift(); // Elimina el registro más antiguo
            currentSize = JSON.stringify(this.records).length;
        }
    }
}

// Mapa para mantener una instancia de logger por cada widget
const loggers = new Map();

export function getDataLogger(widgetId, limitKB) {
    if (!loggers.has(widgetId)) {
        loggers.set(widgetId, new WidgetLogger(widgetId, limitKB));
    }
    const logger = loggers.get(widgetId);
    if(limitKB) {
      logger.setLimit(limitKB);
    }
    return logger;
}