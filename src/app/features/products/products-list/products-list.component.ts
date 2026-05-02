import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { SidebarComponent } from '../../../shared/sidebar/sidebar.component';
import { ProductService } from '../../../core/services/product.service';
import { ProductResponse } from '../../../core/models/api.models';
import { parseApiError } from '../../../core/utils/api-error.util';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [RouterLink, FormsModule, SidebarComponent],
  templateUrl: './products-list.component.html',
})
export class ProductsListComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  private productService = inject(ProductService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  searchQuery = signal('');
  currentPage = signal(1);
  readonly pageSize = 6;

  products = signal<ProductResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  deleteConfirmId = signal<number | null>(null);
  isDeleting = signal(false);

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(
      (p) => p.name.toLowerCase().includes(q)
    );
  });

  paginated = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.ceil(this.filtered().length / this.pageSize)
  );

  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  ngOnInit(): void {
    this.loadProducts();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((query) => {
      this.currentPage.set(1);
      if (query.trim()) {
        this.searchForProducts(query.trim());
      } else {
        this.loadProducts();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
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

  private searchForProducts(query: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.productService.searchProducts(query).subscribe({
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

  setPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }

  stockClass(status: string): string {
    if (status === 'IN_STOCK') return 'text-emerald-600';
    if (status === 'LOW_STOCK') return 'text-orange-500';
    return 'text-red-500';
  }

  stockLabel(status: string): string {
    if (status === 'IN_STOCK') return 'In Stock';
    if (status === 'LOW_STOCK') return 'Low Stock';
    return 'Out of Stock';
  }

  editProduct(id: number) {
    this.router.navigate(['/products', id, 'edit']);
  }

  confirmDelete(id: number) {
    this.deleteConfirmId.set(id);
  }

  cancelDelete() {
    this.deleteConfirmId.set(null);
  }

  deleteProduct(id: number) {
    this.isDeleting.set(true);
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.products.update((list) => list.filter((p) => p.id !== id));
        this.deleteConfirmId.set(null);
        this.isDeleting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(parseApiError(err));
        this.deleteConfirmId.set(null);
        this.isDeleting.set(false);
      },
    });
  }
}
