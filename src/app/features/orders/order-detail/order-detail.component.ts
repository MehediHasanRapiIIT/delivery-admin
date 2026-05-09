import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/sidebar/sidebar.component';
import { OrderService, OrderStatus } from '../../../core/services/order.service';
import { OrderResponse } from '../../../core/models/api.models';
import { parseApiError } from '../../../core/utils/api-error.util';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
];

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [FormsModule, SidebarComponent],
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);

  readonly statuses = ALL_STATUSES;

  order = signal<OrderResponse | null>(null);
  selectedStatus = signal<OrderStatus>('PENDING');
  isUpdating = signal(false);
  updateError = signal('');
  updateSuccess = signal(false);

  ngOnInit(): void {
    // Order passed via router state — read from history.state which persists after navigation
    const stateOrder = history.state?.order as OrderResponse | undefined;

    if (stateOrder) {
      this.order.set(stateOrder);
      this.selectedStatus.set(stateOrder.orderStatus as OrderStatus);
    } else {
      // Fallback: navigated directly (e.g. page refresh) — go back to list
      this.router.navigate(['/orders']);
    }
  }

  goBack(): void {
    this.router.navigate(['/orders']);
  }

  printInvoice(): void {
    window.print();
  }

  scrollToStatus(): void {
    document.getElementById('status-update-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** Build a simple timeline from the current order status */
  timeline(): { label: string; done: boolean; time?: string }[] {
    const o = this.order();
    if (!o) return [];
    const statusOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIdx = statusOrder.indexOf(o.orderStatus.toUpperCase());
    return statusOrder.map((s, i) => ({
      label: s.replace(/_/g, ' '),
      done: i <= currentIdx,
      time: i === 0 ? this.formatDate(o.createdAt) : undefined,
    }));
  }

  onUpdateStatus(): void {
    const o = this.order();
    if (!o) return;

    this.isUpdating.set(true);
    this.updateError.set('');
    this.updateSuccess.set(false);

    this.orderService.updateOrderStatus(o.id, this.selectedStatus()).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.selectedStatus.set(updated.orderStatus as OrderStatus);
        this.isUpdating.set(false);
        this.updateSuccess.set(true);
        setTimeout(() => this.updateSuccess.set(false), 3000);
      },
      error: (err) => {
        this.updateError.set(parseApiError(err));
        this.isUpdating.set(false);
      },
    });
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

  subtotal(): number {
    const o = this.order();
    if (!o) return 0;
    return o.orderItems.reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0);
  }

  grandTotal(): number {
    const o = this.order();
    if (!o) return 0;
    return this.subtotal() + Number(o.deliveryCharge ?? 0);
  }

  statusChanged(): boolean {
    return this.selectedStatus() !== this.order()?.orderStatus;
  }
}
