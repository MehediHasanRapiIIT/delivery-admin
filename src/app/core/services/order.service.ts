import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrderResponse, OrderSummary, PageResponse } from '../models/api.models';

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

  getSummary(): Observable<OrderSummary> {
    return this.http.get<OrderSummary>(`${this.baseUrl}/admin/orders/summary`);
  }

  getAllOrders(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.baseUrl}/admin/orders`);
  }

  getOrdersPaged(page: number, size: number, status?: string, fromDate?: string, toDate?: string): Observable<PageResponse<OrderResponse>> {
    const params: Record<string, string> = { page: String(page), size: String(size) };
    if (status && status !== 'ALL') params['status'] = status;
    if (fromDate) params['fromDate'] = fromDate;
    if (toDate) params['toDate'] = toDate;
    return this.http.get<PageResponse<OrderResponse>>(`${this.baseUrl}/admin/orders/paged`, { params });
  }

  getOrdersByStatus(status: OrderStatus): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.baseUrl}/admin/orders/status/${status}`);
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${this.baseUrl}/admin/orders/${orderId}/status`, { status });
  }

  getOrdersByUser(userId: string): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.baseUrl}/app/consumer/${userId}/orders`);
  }

  getOrderDetails(userId: string, orderId: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.baseUrl}/app/consumer/${userId}/orders/${orderId}`);
  }
}
