import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockResponse, StockUpdateRequest } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  getStock(productId: number): Observable<StockResponse> {
    return this.http.get<StockResponse>(`${this.baseUrl}/admin/products/${productId}/stock`);
  }

  updateStock(productId: number, request: StockUpdateRequest): Observable<StockResponse> {
    return this.http.put<StockResponse>(`${this.baseUrl}/admin/products/${productId}/stock`, request);
  }
}
