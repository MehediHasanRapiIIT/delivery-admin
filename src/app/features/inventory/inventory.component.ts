import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { ProductService } from '../../core/services/product.service';
import { StockService } from '../../core/services/stock.service';
import { ProductResponse, StockResponse, StockUpdateRequest } from '../../core/models/api.models';
import { parseApiError } from '../../core/utils/api-error.util';

interface ProductWithStock extends ProductResponse {
  stockDetail?: StockResponse;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule, SidebarComponent],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent implements OnInit {
  private productService = inject(ProductService);
  private stockService = inject(StockService);

  products = signal<ProductWithStock[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  searchQuery = signal('');

  // Stock update panel state
  activeProductId = signal<number | null>(null);
  operation = signal<'SET' | 'INCREMENT' | 'DECREMENT'>('SET');
  quantity = signal<number>(0);
  updateLoading = signal(false);
  updateError = signal('');
  updateSuccess = signal(false);

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.products();
    return this.products().filter((p) => p.name.toLowerCase().includes(q));
  });

  // Summary counts
  criticalLow = computed(() =>
    this.products().filter((p) => p.stockStatus === 'LOW_STOCK').length
  );
  outOfStock = computed(() =>
    this.products().filter((p) => p.stockStatus === 'OUT_OF_STOCK').length
  );

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(parseApiError(err));
        this.isLoading.set(false);
      },
    });
  }

  openUpdatePanel(product: ProductWithStock): void {
    this.activeProductId.set(product.id);
    this.operation.set('SET');
    this.quantity.set(product.stockQuantity);
    this.updateError.set('');
    this.updateSuccess.set(false);
  }

  closeUpdatePanel(): void {
    this.activeProductId.set(null);
    this.updateError.set('');
    this.updateSuccess.set(false);
  }

  submitUpdate(): void {
    const id = this.activeProductId();
    if (!id || this.quantity() < 0) return;

    const request: StockUpdateRequest = {
      operation: this.operation(),
      quantity: this.quantity(),
    };

    this.updateLoading.set(true);
    this.updateError.set('');
    this.updateSuccess.set(false);

    this.stockService.updateStock(id, request).subscribe({
      next: (updated) => {
        this.products.update((list) =>
          list.map((p) =>
            p.id === id
              ? { ...p, stockQuantity: updated.stockQuantity, stockStatus: updated.stockStatus }
              : p
          )
        );
        this.updateLoading.set(false);
        this.updateSuccess.set(true);
        setTimeout(() => this.closeUpdatePanel(), 1200);
      },
      error: (err) => {
        this.updateError.set(parseApiError(err));
        this.updateLoading.set(false);
      },
    });
  }

  activeProduct = computed(() =>
    this.products().find((p) => p.id === this.activeProductId()) ?? null
  );

  stockBadgeClass(status: string): string {
    if (status === 'IN_STOCK') return 'bg-emerald-100 text-emerald-700';
    if (status === 'LOW_STOCK') return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-600';
  }

  stockLabel(status: string): string {
    if (status === 'IN_STOCK') return 'In Stock';
    if (status === 'LOW_STOCK') return 'Low Stock';
    return 'Out of Stock';
  }

  stockQtyClass(status: string): string {
    if (status === 'IN_STOCK') return 'text-gray-800';
    if (status === 'LOW_STOCK') return 'text-orange-500 font-bold';
    return 'text-red-500 font-bold';
  }
}
