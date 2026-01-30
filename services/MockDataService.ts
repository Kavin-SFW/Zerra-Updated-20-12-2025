import LoggerService from "./LoggerService";

export interface MockDataSource {
  id: string;
  name: string;
  type: string;
  status: "active" | "syncing" | "error" | "inactive";
  row_count: number;
  created_at: string;
  last_synced_at: string;
  is_mock: boolean;
  mapping?: Record<string, unknown>;
  tableName?: string;
}

type Subscriber = (id: string, data: unknown[]) => void;

class MockDataService {
  private sources: MockDataSource[] = [];
  private dataStore: Record<string, unknown[]> = {};
  private subscribers: Subscriber[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    this.sources = JSON.parse(localStorage.getItem('zerra_mock_sources') || '[]');
    this.dataStore = JSON.parse(localStorage.getItem('zerra_mock_data') || '{}');
  }

  private save() {
    localStorage.setItem('zerra_mock_sources', JSON.stringify(this.sources));
    localStorage.setItem('zerra_mock_data', JSON.stringify(this.dataStore));
  }

  subscribe(fn: Subscriber) {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }

  private notify(id: string) {
    const data = this.dataStore[id];
    this.subscribers.forEach(s => s(id, data));
  }

  addSource(name: string, type: string, data: unknown[], mapping?: Record<string, unknown>, tableName?: string, is_mock = true): MockDataSource {
    // Polyfill for environments where crypto.randomUUID is not available (e.g. non-secure contexts)
    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

    const source: MockDataSource = {
      id, name, type,
      status: 'active',
      row_count: data.length,
      created_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      is_mock,
      mapping,
      tableName
    };
    this.sources.unshift(source);
    this.dataStore[id] = data;
    this.save();
    LoggerService.info('MockData', 'ADD_SOURCE', `Added mock/local source: ${name}`, { type, is_mock, rowCount: data.length });
    return source;
  }

  deleteSource(id: string) {
    const source = this.sources.find(s => s.id === id);
    this.sources = this.sources.filter(s => s.id !== id);
    delete this.dataStore[id];
    this.save();
    LoggerService.info('MockData', 'DELETE_SOURCE', `Deleted mock/local source: ${source?.name || id}`, { id });
  }

  upsertRecord(sourceId: string, record: unknown) {
    const data = this.dataStore[sourceId] || [];
    const typedRecord = record as Record<string, unknown>;
    const index = data.findIndex(r => (r as Record<string, unknown>).id === typedRecord.id);
    if (index >= 0) data[index] = record;
    else data.unshift(record);
    this.dataStore[sourceId] = data;
    this.notify(sourceId);
    this.save();
    LoggerService.info('MockData', 'UPSERT_RECORD', `Upserted record in source: ${sourceId}`, { sourceId });
  }

  updateSourceData(sourceId: string, data: unknown[]) {
    this.dataStore[sourceId] = data;
    // Update row count in source metadata
    const sourceIndex = this.sources.findIndex(s => s.id === sourceId);
    if (sourceIndex >= 0) {
      this.sources[sourceIndex].row_count = data.length;
      this.sources[sourceIndex].last_synced_at = new Date().toISOString();
    }
    this.notify(sourceId);
    this.save();
    LoggerService.info('MockData', 'UPDATE_DATA', `Updated data for source: ${sourceId}`, { sourceId, rowCount: data.length });
  }

  deleteRecord(sourceId: string, recordId: unknown) {
    this.dataStore[sourceId] = (this.dataStore[sourceId] || []).filter(r => (r as Record<string, unknown>).id !== recordId);
    this.notify(sourceId);
    this.save();
    LoggerService.info('MockData', 'DELETE_RECORD', `Deleted record ${recordId} from source ${sourceId}`, { sourceId, recordId });
  }

  getSources() { return this.sources; }
  getData(id: string) { return this.dataStore[id] || null; }
}

export const mockDataService = new MockDataService();

