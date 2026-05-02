import { Component, signal, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { HomeResponse } from '../../core/models/api.models';
import { parseApiError } from '../../core/utils/api-error.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  protected auth = inject(AuthService);
  private dashboardService = inject(DashboardService);

  sidebarOpen = signal(true);
  homeData = signal<HomeResponse | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  // SVG polyline points for the chart (7 days, Mon–Sun)
  readonly chartPoints = '40,120 120,70 200,95 280,80 360,30 440,60 520,90';
  readonly chartArea = '40,120 120,70 200,95 280,80 360,30 440,60 520,90 520,160 40,160';

  activeTab = signal<'Weekly' | 'Monthly'>('Weekly');
  setTab(tab: 'Weekly' | 'Monthly') { this.activeTab.set(tab); }

  ngOnInit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.dashboardService.getHomeData().subscribe({
      next: (data) => {
        this.homeData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(parseApiError(err));
        this.isLoading.set(false);
      },
    });
  }
}
