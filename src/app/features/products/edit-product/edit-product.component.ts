import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/sidebar/sidebar.component';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CategoryResponse, ProductRequest } from '../../../core/models/api.models';
import { parseApiError } from '../../../core/utils/api-error.util';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [RouterLink, FormsModule, SidebarComponent],
  templateUrl: './edit-product.component.html',
})
export class EditProductComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);

  productId = signal<number>(0);

  // Form fields
  productName    = signal('');
  description    = signal('');
  basePrice      = signal<number | null>(null);
  discount       = signal<number>(0);
  categoryId     = signal<number | null>(null);
  shopId         = signal(1);
  isAvailable    = signal(true);
  dragOver       = signal(false);
  uploadedImages = signal<string[]>([]);
  imageFile      = signal<File | null>(null);
  existingImageUrl = signal('');

  // State
  categories   = signal<CategoryResponse[]>([]);
  isLoading    = signal(false);
  isFetching   = signal(true);
  errorMessage = signal('');
  fieldErrors  = signal<Record<string, string>>({});

  readonly descMax = 500;
  descLength = computed(() => this.description().length);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productId.set(id);

    this.categoryService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: (err) => this.errorMessage.set(parseApiError(err)),
    });

    this.productService.getProduct(id).subscribe({
      next: (p) => {
        this.productName.set(p.name);
        this.description.set(p.description);
        this.basePrice.set(p.price);
        this.categoryId.set(p.categoryId);
        this.isAvailable.set(p.isAvailable);
        this.existingImageUrl.set(p.imageUrl ?? '');
        // discountPrice back to percentage is approximate; store 0 if unknown
        this.discount.set(0);
        this.isFetching.set(false);
      },
      error: (err) => {
        this.errorMessage.set(parseApiError(err));
        this.isFetching.set(false);
      },
    });
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragOver.set(true); }
  onDragLeave()             { this.dragOver.set(false); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const files = e.dataTransfer?.files;
    if (files) this.#handleFiles(files);
  }
  onFileSelect(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files) this.#handleFiles(files);
  }

  #handleFiles(files: FileList) {
    const file = files[0];
    if (!file) return;
    this.imageFile.set(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.uploadedImages.set([ev.target!.result as string]);
      this.existingImageUrl.set('');
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.uploadedImages.set([]);
    this.imageFile.set(null);
  }

  onSave() {
    this.errorMessage.set('');
    this.fieldErrors.set({});

    if (!this.productName().trim()) {
      this.fieldErrors.set({ name: 'Product name is required.' });
      return;
    }
    if (!this.basePrice() || this.basePrice()! <= 0) {
      this.fieldErrors.set({ price: 'A valid price is required.' });
      return;
    }
    if (!this.categoryId()) {
      this.fieldErrors.set({ categoryId: 'Please select a category.' });
      return;
    }

    const dto: ProductRequest = {
      name: this.productName().trim(),
      description: this.description().trim(),
      price: this.basePrice()!,
      discountPercentage: this.discount() || undefined,
      categoryId: this.categoryId()!,
      shopId: this.shopId(),
      isAvailable: this.isAvailable(),
    };

    this.isLoading.set(true);
    this.productService.updateProduct(this.productId(), dto, this.imageFile() ?? undefined).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const body = err?.error;
        if (body?.errors) {
          this.fieldErrors.set(body.errors);
        } else {
          this.errorMessage.set(parseApiError(err));
        }
      },
    });
  }

  onCancel() {
    this.router.navigate(['/products']);
  }
}
