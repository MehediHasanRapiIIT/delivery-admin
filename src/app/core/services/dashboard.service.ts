import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HomeResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  getHomeData(): Observable<HomeResponse> {
    return this.http.get<HomeResponse>(`${this.baseUrl}/app/home`);
  }
}
