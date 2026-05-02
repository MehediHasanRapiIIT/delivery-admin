import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/sidebar/sidebar.component';
import { CategoryService } from '../../../core/services/category.service';
import { CategoryResponse } from '../../../core/models/api.models';
import { parseApiError } from '../../../core/utils/api-error.util';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [RouterLink, FormsModule, SidebarComponent],
  templateUrl: './categories-list.component.html',
})
export class CategoriesListComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private router = inject(Router);

  searchQuery = signal('');
  currentPage = signal(1);
  readonly pageSize = 5;

  categories = signal<CategoryResponse[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  deleteConfirmId = signal<number | null>(null);
  isDeleting = signal(false);

  filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.categories();
    return this.categories().filter((c) => c.name.toLowerCase().includes(q));
  });

  paginated = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize));

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
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

  minVal(a: number, b: number): number {
    return Math.min(a, b);
  }

  editCategory(id: number) {
    this.router.navigate(['/categories', id, 'edit']);
  }

  confirmDelete(id: number) {
    this.deleteConfirmId.set(id);
  }

  cancelDelete() {
    this.deleteConfirmId.set(null);
  }

  deleteCategory(id: number) {
    this.isDeleting.set(true);
    this.categoryService.deleteCategory(id).subscribe({
      next: () => {
        this.categories.update((list) => list.filter((c) => c.id !== id));
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
