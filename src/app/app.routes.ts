import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/products-list/products-list.component').then((m) => m.ProductsListComponent),
  },
  {
    path: 'products/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/add-product/add-product.component').then((m) => m.AddProductComponent),
  },
  {
    path: 'products/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/products/edit-product/edit-product.component').then((m) => m.EditProductComponent),
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/categories/categories-list/categories-list.component').then((m) => m.CategoriesListComponent),
  },
  {
    path: 'categories/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/categories/add-category/add-category.component').then((m) => m.AddCategoryComponent),
  },
  {
    path: 'categories/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/categories/edit-category/edit-category.component').then((m) => m.EditCategoryComponent),
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventory/inventory.component').then((m) => m.InventoryComponent),
  },
  {
    path: 'banners',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/banners/banners.component').then((m) => m.BannersComponent),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/orders.component').then((m) => m.OrdersComponent),
  },
  {
    path: 'orders/:orderId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
  },
  { path: '**', redirectTo: 'login' },
];
