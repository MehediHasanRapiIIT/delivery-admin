import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { OrderService, OrderStatus } from '../../core/services/order.service';
import { OrderResponse } from '../../core/models/api.models';
import { parseApiError } from '../../core/utils/api-error.util';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
];

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, SidebarComponent],
  templateUrl: './orders.component.html',
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private router = inject(Router);

  readonly statuses = ALL_STATUSES;
  activeStatus = signal<OrderStatus | 'ALL'>('ALL');

  orders = signal<OrderResponse[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  searchQuery = signal('');

  currentPage = signal(1);
  readonly pageSize = 10;

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.orders();
    return this.orders().filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.deliveryAddress.toLowerCase().includes(q) ||
        o.paymentMethod.toLowerCase().includes(q)
    );
  });

  paginated = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize));

  // Status counts from the full loaded list
  countByStatus = computed(() => {
    const counts: Record<string, number> = { ALL: this.orders().length };
    for (const s of ALL_STATUSES) {
      counts[s] = this.orders().filter((o) => o.orderStatus === s).length;
    }
    return counts;
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.currentPage.set(1);

    const status = this.activeStatus();
    const req$ = status === 'ALL'
      ? this.orderService.getAllOrders()
      : this.orderService.getOrdersByStatus(status);

    req$.subscribe({
      next: (data) => { this.orders.set(data); this.isLoading.set(false); },
      error: (err) => { this.errorMessage.set(parseApiError(err)); this.isLoading.set(false); },
    });
  }

  setStatus(status: OrderStatus | 'ALL'): void {
    this.activeStatus.set(status);
    this.searchQuery.set('');
    this.loadOrders();
  }

  viewOrder(order: OrderResponse): void {
    this.router.navigate(['/orders', order.id], { state: { order } });
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  statusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':           return 'bg-yellow-100 text-yellow-700';
      case 'CONFIRMED':         return 'bg-blue-100 text-blue-700';
      case 'PREPARING':         return 'bg-orange-100 text-orange-700';
      case 'OUT_FOR_DELIVERY':  return 'bg-indigo-100 text-indigo-700';
      case 'DELIVERED':         return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED':         return 'bg-red-100 text-red-600';
      default:                  return 'bg-gray-100 text-gray-600';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatAmount(amount: number | string): string {
    return Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 2 });
  }

  shortId(id: string): string {
    return id ? '#' + id.slice(0, 8).toUpperCase() : '—';
  }
}
