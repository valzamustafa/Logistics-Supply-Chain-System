
import * as signalR from '@microsoft/signalr';
import { Shipment } from './shipmentService';
import { getLocalStorageItem } from '../utils/localStorage';

export interface OrderUpdateEvent {
  orderId: number;
  purchaseOrderId?: number;
  status: string;
  purchaseOrderStatus: string;
  shipmentId?: string;
}

export class DashboardSignalRService {
  private connection: signalR.HubConnection | null = null;

  async connect(): Promise<void> {
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

    const hubUrl = import.meta.env.VITE_DASHBOARD_HUB_URL || 'http://localhost:5008/dashboardHub';
    const token = getLocalStorageItem('token') || '';

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.onclose(() => {
      if (this.connection === connection) {
        this.connection = null;
      }
    });

    await connection.start();
    this.connection = connection;
  }

  onShipmentUpdate(callback: (shipment: Shipment) => void): () => void {
    this.connection?.on('ReceiveShipmentUpdate', callback);
    return () => this.connection?.off('ReceiveShipmentUpdate', callback);
  }

  onOrderUpdate(callback: (update: OrderUpdateEvent) => void): () => void {
    this.connection?.on('ReceiveOrderUpdate', callback);
    return () => this.connection?.off('ReceiveOrderUpdate', callback);
  }

  onStatsUpdate(callback: (stats: any) => void): () => void {
    this.connection?.on('ReceiveStatsUpdate', callback);
    return () => this.connection?.off('ReceiveStatsUpdate', callback);
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {

      }
      this.connection = null;
    }
  }
}

export const dashboardSignalRService = new DashboardSignalRService();
