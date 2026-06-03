import * as signalR from '@microsoft/signalr';
import type { NotificationDto } from './notificationService';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private chatConnection: signalR.HubConnection | null = null;
  private notificationCallbacks: ((notification: NotificationDto) => void)[] = [];
  private entityUpdateCallbacks: ((payload: any) => void)[] = [];

  async connect(userId: number): Promise<void> {
    try {

      const token = localStorage.getItem('token');

      const notificationBase = import.meta.env.VITE_NOTIFICATION_API_URL?.trim();
      const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
      const hubBases = [notificationBase, apiBase, 'http://localhost:5000', 'http://localhost:5009']
          .filter((value): value is string => !!value);

      if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
        return;
      }

      if (this.connection) {
        try {
          await this.connection.stop();
        } catch {

        }
        this.connection = null;
      }

      let lastError: unknown;
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      for (const hubBase of hubBases) {
        const hubUrl = `${hubBase.replace(/\/$/, '')}/notificationsHub`;
        try {
          const conn = new signalR.HubConnectionBuilder()
              .withUrl(hubUrl, {
                accessTokenFactory: () => localStorage.getItem('token') || '',
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
              })
              .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
              .configureLogging(signalR.LogLevel.Information)
              .build();

          conn.on('ReceiveNotification', (notification: NotificationDto) => {
            console.log('Received notification via SignalR:', notification);
            this.notificationCallbacks.forEach(callback => callback(notification));
          });

          conn.on('EntityUpdated', (payload: any) => {
            console.log('Received entity update via SignalR:', payload);
            this.entityUpdateCallbacks.forEach(cb => cb(payload));
          });




          await conn.start();

          if (conn.state !== signalR.HubConnectionState.Connected) {
            try { await conn.stop(); } catch {};
            throw new Error('Connection not established after start()');
          }


          conn.onclose(() => {
            console.log('SignalR disconnected');
            if (this.connection === conn) {
              this.connection = null;
            }
          });


          this.connection = conn;

          console.log('SignalR connected successfully to', hubUrl);


          await delay(50);

          if (conn.state === signalR.HubConnectionState.Connected) {
            await conn.invoke('SubscribeToUser', userId);
            console.log(`Subscribed to user-${userId} group`);
            return;
          } else {
            try { await conn.stop(); } catch {};
            if (this.connection === conn) this.connection = null;
            throw new Error('Connection not in Connected state before SubscribeToUser');
          }
        } catch (err) {
          console.warn(`SignalR connection failed for ${hubBase}:`, err);
          lastError = err;
          try {


            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (typeof conn !== 'undefined' && conn && conn.stop) await conn.stop();
          } catch {

          }
          if (this.connection) {
            try { await this.connection.stop(); } catch {}
            this.connection = null;
          }

          await delay(500);
        }
      }

      console.error('SignalR connection failed on all configured endpoints');
      throw lastError || new Error('Failed to connect to SignalR hub');

    } catch (err) {
      console.error('SignalR connection failed:', err);
      throw err;
    }
  }

  async connectToChat(userId: number): Promise<void> {
    try {
      if (this.chatConnection && this.chatConnection.state === signalR.HubConnectionState.Connected) return;
      const notificationBase = import.meta.env.VITE_NOTIFICATION_API_URL?.trim();
      const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
      const hubBases = [notificationBase, apiBase, 'http://localhost:5000', 'http://localhost:5009']
          .filter((value): value is string => !!value);

      for (const hubBase of hubBases) {
        const hubUrl = `${hubBase.replace(/\/$/, '')}/chatHub`;
        try {
          const conn = new signalR.HubConnectionBuilder()
              .withUrl(hubUrl, { accessTokenFactory: () => localStorage.getItem('token') || '' })
              .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
              .configureLogging(signalR.LogLevel.Information)
              .build();

          conn.on('ReceiveChatMessage', (message: any) => {
            console.log('Chat message via chatConnection:', message);
            this.entityUpdateCallbacks.forEach(cb => cb({ Type: 'chat', Message: message }));
          });

          await conn.start();
          if (conn.state === signalR.HubConnectionState.Connected) {
            await conn.invoke('SubscribeToUser', userId);
            this.chatConnection = conn;
            console.log('Chat connection established to', hubUrl);
            return;
          }
        } catch (err) {
          console.warn('Chat connection failed for', hubBase, err);
        }
      }
    } catch (err) {
      console.error('Chat connection error', err);
    }
  }

  onNotificationReceived(callback: (notification: NotificationDto) => void): () => void {
    this.notificationCallbacks.push(callback);

    return () => {
      this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
    };
  }

  onEntityUpdated(callback: (payload: any) => void): () => void {
    this.entityUpdateCallbacks.push(callback);
    return () => {
      this.entityUpdateCallbacks = this.entityUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      console.log('SignalR disconnected');
    }
  }

  getConnectionState(): signalR.HubConnectionState | null {
    return this.connection?.state || null;
  }
}

export const signalRService = new SignalRService();


