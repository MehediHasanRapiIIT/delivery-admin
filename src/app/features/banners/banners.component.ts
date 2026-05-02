import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { BannerService } from '../../core/services/banner.service';
import { BannerResponse } from '../../core/models/api.models';
import { parseApiError } from '../../core/utils/api-error.util';

@Component({
  selector: 'app-banners',
  standalone: true,
  imports: [FormsModule, SidebarComponent],
  templateUrl: './banners.component.html',
})
export class BannersComponent implements OnInit {
  private bannerService = inject(BannerService);

  banners = signal<BannerResponse[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  // Upload form
  showUploadForm = signal(false);
  dragOver = signal(false);
  imageFile = signal<File | null>(null);
  imagePreview = signal('');
  promotionTitle = signal('');
  promotionDetails = signal('');
  fromDate = signal('');
  toDate = signal('');
  isUploading = signal(false);
  uploadError = signal('');

  // Delete confirm
  deleteConfirmId = signal<string | null>(null);
  isDeleting = signal(false);

  ngOnInit(): void {
    this.loadBanners();
  }

  private loadBanners(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.bannerService.getBanners().subscribe({
      next: (data) => { this.banners.set(data); this.isLoading.set(false); },
      error: (err) => { this.errorMessage.set(parseApiError(err)); this.isLoading.set(false); },
    });
  }

  toggleUploadForm(): void {
    this.showUploadForm.update((v) => !v);
    this.resetForm();
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragOver.set(true); }
  onDragLeave() { this.dragOver.set(false); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const files = e.dataTransfer?.files;
    if (files?.length) this.handleFile(files[0]);
  }
  onFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.handleFile(file);
  }

  private handleFile(file: File): void {
    this.imageFile.set(file);
    const reader = new FileReader();
    reader.onload = (ev) => this.imagePreview.set(ev.target!.result as string);
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imageFile.set(null);
    this.imagePreview.set('');
  }

  onUpload(): void {
    const file = this.imageFile();
    if (!file) { this.uploadError.set('Please select an image.'); return; }

    this.isUploading.set(true);
    this.uploadError.set('');

    this.bannerService.uploadBanner(
      file,
      this.promotionTitle() || undefined,
      this.promotionDetails() || undefined,
      this.fromDate() || undefined,
      this.toDate() || undefined,
    ).subscribe({
      next: (banner) => {
        this.banners.update((list) => [banner, ...list]);
        this.isUploading.set(false);
        this.showUploadForm.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.uploadError.set(parseApiError(err));
        this.isUploading.set(false);
      },
    });
  }

  confirmDelete(id: string): void { this.deleteConfirmId.set(id); }
  cancelDelete(): void { this.deleteConfirmId.set(null); }

  deleteBanner(id: string): void {
    this.isDeleting.set(true);
    this.bannerService.deleteBanner(id).subscribe({
      next: () => {
        this.banners.update((list) => list.filter((b) => b.id !== id));
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

  private resetForm(): void {
    this.imageFile.set(null);
    this.imagePreview.set('');
    this.promotionTitle.set('');
    this.promotionDetails.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.uploadError.set('');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
