import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrderResponse } from '../models/api.models';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  // Admin endpoints
  getAllOrders(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.baseUrl}/admin/orders`);
  }

  getOrdersByStatus(status: OrderStatus): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.baseUrl}/admin/orders/status/${status}`);
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${this.baseUrl}/admin/orders/${orderId}/status`, { status });
  }

  // Consumer endpoints (for detail view — still needs userId)
  getOrderDetails(userId: string, orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.baseUrl}/app/consumer/${userId}/orders/${orderId}`);
  }
}
