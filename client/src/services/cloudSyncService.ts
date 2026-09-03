import mqtt, { MqttClient } from 'mqtt';
import { AuditItem } from '../types';
import { storageService } from './storage';

export interface AuditsSyncMessage {
  type: 'AUDITS_UPDATE' | 'AUDITS_CLEAR' | 'PING';
  senderId: string;
  senderRole: 'WORKER' | 'ADMIN';
  storeId: string;
  timestamp: number;
  audits: AuditItem[];
}

export type SyncStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

type SyncListener = (audits: AuditItem[], message: AuditsSyncMessage) => void;
type StatusListener = (status: SyncStatus, lastSyncTime?: string) => void;

class CloudSyncService {
  private client: MqttClient | null = null;
  private currentStoreId: string = '1060';
  private mySenderId: string = '';
  private syncListeners: Set<SyncListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private connectionStatus: SyncStatus = 'DISCONNECTED';
  private lastSyncTime: string = '';

  constructor() {
    let id = '';
    try {
      id = sessionStorage.getItem('albagom_device_id') || '';
      if (!id) {
        id = `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
        sessionStorage.setItem('albagom_device_id', id);
      }
    } catch {
      id = `dev_${Math.random().toString(36).substring(2, 9)}`;
    }
    this.mySenderId = id;
  }

  public getSenderId(): string {
    return this.mySenderId;
  }

  public getStatus(): SyncStatus {
    return this.connectionStatus;
  }

  public getLastSyncTime(): string {
    return this.lastSyncTime;
  }

  public onSync(listener: SyncListener): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.connectionStatus, this.lastSyncTime);
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus(status: SyncStatus) {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => listener(status, this.lastSyncTime));
  }

  private notifySync(audits: AuditItem[], message: AuditsSyncMessage) {
    this.lastSyncTime = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    this.notifyStatus('CONNECTED');
    this.syncListeners.forEach((listener) => listener(audits, message));
  }

  public connect(storeId?: string, role: 'WORKER' | 'ADMIN' = 'WORKER') {
    const targetStoreId = storeId || storageService.getSettings().younmeId || '1060';
    this.currentStoreId = targetStoreId;

    if (this.client && this.client.connected) {
      return;
    }

    this.notifyStatus('CONNECTING');

    const topicSync = `albagom/stores/store_${this.currentStoreId}/audits_sync`;
    const brokerUrl = 'wss://broker.hivemq.com:8884/mqtt';

    const clientId = `web_${role.toLowerCase()}_${this.mySenderId}_${Math.random().toString(16).substring(2, 6)}`;

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 4000,
      });

      this.client.on('connect', () => {
        this.notifyStatus('CONNECTED');
        this.client?.subscribe(topicSync, { qos: 1 }, (err) => {
          if (err) {
            console.error('[CloudSync] 토픽 구독 실패:', err);
            this.notifyStatus('ERROR');
          }
        });
      });

      this.client.on('message', (topic, payload) => {
        if (topic !== topicSync) return;
        try {
          const msg: AuditsSyncMessage = JSON.parse(payload.toString());
          if (msg.senderId === this.mySenderId) {
            return;
          }

          if (msg.type === 'AUDITS_UPDATE') {
            storageService.saveAudits(msg.audits || []);
            this.notifySync(msg.audits || [], msg);
          } else if (msg.type === 'AUDITS_CLEAR') {
            storageService.clearAudits();
            this.notifySync([], msg);
          }
        } catch (e) {
          console.error('[CloudSync] 메시지 수신 파싱 오류:', e);
        }
      });

      this.client.on('error', (err) => {
        console.error('[CloudSync] 클라이언트 오류:', err);
        this.notifyStatus('ERROR');
      });

      this.client.on('offline', () => {
        this.notifyStatus('DISCONNECTED');
      });

      this.client.on('reconnect', () => {
        this.notifyStatus('CONNECTING');
      });
    } catch (err) {
      console.error('[CloudSync] 연결 시도 오류:', err);
      this.notifyStatus('ERROR');
    }
  }

  public broadcastAudits(audits: AuditItem[], role: 'WORKER' | 'ADMIN' = 'WORKER'): Promise<boolean> {
    return new Promise((resolve) => {
      const topicSync = `albagom/stores/store_${this.currentStoreId}/audits_sync`;

      const payload: AuditsSyncMessage = {
        type: 'AUDITS_UPDATE',
        senderId: this.mySenderId,
        senderRole: role,
        storeId: this.currentStoreId,
        timestamp: Date.now(),
        audits,
      };

      this.lastSyncTime = new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      this.notifyStatus('CONNECTED');

      if (!this.client || !this.client.connected) {
        this.connect(this.currentStoreId, role);
        setTimeout(() => {
          if (this.client && this.client.connected) {
            this.client.publish(topicSync, JSON.stringify(payload), { qos: 1, retain: true }, () => resolve(true));
          } else {
            resolve(false);
          }
        }, 1000);
        return;
      }

      this.client.publish(topicSync, JSON.stringify(payload), { qos: 1, retain: true }, (err) => {
        if (err) {
          console.error('[CloudSync] 발행 실패:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  public broadcastClear(role: 'WORKER' | 'ADMIN' = 'ADMIN'): Promise<boolean> {
    return new Promise((resolve) => {
      const topicSync = `albagom/stores/store_${this.currentStoreId}/audits_sync`;
      const payload: AuditsSyncMessage = {
        type: 'AUDITS_CLEAR',
        senderId: this.mySenderId,
        senderRole: role,
        storeId: this.currentStoreId,
        timestamp: Date.now(),
        audits: [],
      };

      if (!this.client || !this.client.connected) {
        resolve(false);
        return;
      }

      this.client.publish(topicSync, JSON.stringify(payload), { qos: 1, retain: true }, (err) => {
        if (err) {
          console.error('[CloudSync] 초기화 발행 실패:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  public disconnect() {
    if (this.client) {
      try {
        this.client.end();
      } catch {}
      this.client = null;
    }
    this.notifyStatus('DISCONNECTED');
  }
}

export const cloudSyncService = new CloudSyncService();