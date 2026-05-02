import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  protected auth = inject(AuthService);

  navItems = [
    { label: 'Dashboard',  icon: 'dashboard',  route: '/dashboard' },
    { label: 'Orders',     icon: 'orders',     route: '/orders' },
    { label: 'Products',   icon: 'products',   route: '/products' },
    { label: 'Categories', icon: 'categories', route: '/categories' },
    { label: 'Inventory',  icon: 'inventory',  route: '/inventory' },
    { label: 'Banners',    icon: 'banners',    route: '/banners' },
    { label: 'Customers',  icon: 'customers',  route: '/customers' },
    { label: 'Delivery',   icon: 'delivery',   route: '/delivery' },
  ];
}
