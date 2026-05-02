# Design Document: AmarBazaar Admin Panel — API Integration

## Overview

This design covers wiring the existing Angular 21 admin panel to a live Spring Boot backend at `http://localhost:8080`. The work is purely integration — no new pages are added. The changes are:

- Bootstrap `HttpClient` and register a JWT/error interceptor
- Replace mock `AuthService` with a real OTP-based two-step login flow
- Apply route guards to all protected routes
- Create `ProductService`, `CategoryService`, and `DashboardService` that call the real APIs
- Update existing components to consume signals from those services instead of hardcoded arrays
- Adapt component-local data models to match `ProductResponse` and `CategoryResponse`

---

## Architecture

The app follows Angular's standalone-component architecture with a feature-based folder layout. No new routing structure is introduced. The integration layer sits entirely in `src/app/core/` (services, interceptor, environment) and the feature components are updated in-place.

```
src/
  environments/
    environment.ts          ← base URL constant (new)
  app/
    app.config.ts           ← add provideHttpClient + interceptor (modified)
    app.routes.ts           ← add authGuard / guestGuard (modified)
    core/
      interceptors/
        auth.interceptor.ts ← JWT injection + 401 logout (new)
      services/
        auth.service.ts     ← rewritten for OTP flow (modified)
        product.service.ts  ← new
        category.service.ts ← new
        dashboard.service.ts← new
    features/
      auth/login/           ← two-step OTP form (modified)
      dashboard/            ← consumes DashboardService (modified)
      products/
        products-list/      ← consumes ProductService (modified)
        add-product/        ← submits via ProductService (modified)
      categories/
        categories-list/    ← consumes CategoryService (modified)
        add-category/       ← submits via CategoryService (modified)
```

### Data Flow

```
Component (signal-based state)
  ↕ calls
Service (HttpClient + RxJS → toSignal / async pipe)
  ↕ HTTP
Interceptor (attaches Bearer token, handles 401)
  ↕ HTTP
Backend (http://localhost:8080)
```

Services expose `Observable<T>` methods. Components subscribe via `toSignal()` or manual `.subscribe()` and store results in local signals.

---

## Components and Interfaces

### Environment

```typescript
// src/environments/environment.ts
export const environment = {
  apiBaseUrl: 'http://localhost:8080',
};
```

### Auth Interceptor

`AuthInterceptorFn` (functional interceptor):

1. Reads `token` from `localStorage` / `sessionStorage`.
2. Clones the request with `Authorization: Bearer <token>` if a token exists.
3. Passes the request through; on `HttpErrorResponse` with `status === 401`, calls `AuthService.logout()`.

Registered in `app.config.ts` via:
```typescript
provideHttpClient(withInterceptorsFromDi())
// and
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
```

### AuthService (rewritten)

Signals:
- `_user = signal<AdminSession | null>(...)` — loaded from storage on init
- `isAuthenticated = computed(() => _user() !== null)`
- `currentUser = computed(() => _user())`

Methods:
- `generateOtp(phoneNumber: string): Observable<void>`
- `verifyOtp(phoneNumber: string, otpCode: string, rememberMe: boolean): Observable<void>` — on success, persists `AdminSession` and sets `_user`
- `logout(): void` — clears storage, resets signal, navigates to `/login`

```typescript
export interface AdminSession {
  userId: string;
  token: string;
  phoneNumber: string;
}
```

### ProductService

```typescript
getProducts(): Observable<ProductResponse[]>
searchProducts(name: string): Observable<ProductResponse[]>
getProduct(id: number): Observable<ProductResponse>
createProduct(dto: ProductRequest, image?: File): Observable<ProductResponse>
```

`createProduct` builds a `FormData` with:
- `productRequestDTO` — JSON blob with `Content-Type: application/json`
- `image` — the `File` object (optional)

### CategoryService

```typescript
getCategories(): Observable<CategoryResponse[]>
getCategory(id: number): Observable<CategoryResponse>
createCategory(dto: CategoryRequest): Observable<CategoryResponse>
```

### DashboardService

```typescript
getHomeData(): Observable<HomeResponse>
```

```typescript
export interface HomeResponse {
  banners: BannerResponse[];
  categories: CategoryResponse[];
  popularItems: ProductResponse[];
  featuredItems: ProductResponse[];
}
```

---

## Data Models

All TypeScript interfaces live in `src/app/core/models/api.models.ts`:

```typescript
export interface AdminSession {
  userId: string;
  token: string;
  phoneNumber: string;
}

export interface ProductRequest {
  categoryId: number;
  name: string;
  description: string;
  price: number;
  discountPercentage?: number;
  shopId: number;
  isAvailable: boolean;
}

export interface ProductResponse {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  discountPrice: number;
  imageUrl: string;
  isAvailable: boolean;
  stockQuantity: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  avgRating: number;
  totalReviews: number;
}

export interface CategoryRequest {
  name: string;
  isActive: boolean;
}

export interface CategoryResponse {
  id: number;
  name: string;
  isActive: boolean;
}

export interface BannerResponse {
  id: string;
  imageUrl: string;
  promotionTitle: string;
  promotionDetails: string;
  fromDate: string;
  toDate: string;
}

export interface HomeResponse {
  banners: BannerResponse[];
  categories: CategoryResponse[];
  popularItems: ProductResponse[];
  featuredItems: ProductResponse[];
}

export interface OtpGenerateRequest {
  phoneNumber: string;
}

export interface OtpVerifyRequest {
  phoneNumber: string;
  otpCode: string;
}

export interface OtpVerifyResponse {
  userId: string;
  token: string;
  isNewUser: boolean;
}

export interface ApiValidationError {
  errors: Record<string, string>;
  timestamp: string;
}

export interface ApiBusinessError {
  message: string;
  timestamp: string;
}
```

### Component Model Adaptations

**ProductsListComponent** — remove `sku`, `unit`, `categoryColor` from the local `Product` interface; use `ProductResponse` directly.

**CategoriesListComponent** — remove `subCount`, `itemCount`, `icon`, `iconBg`, `expanded`, `subCategories` from the local `Category` interface; use `CategoryResponse` directly.

**AddProductComponent** — replace the hardcoded `categories` array with a signal populated from `CategoryService.getCategories()`. Remove `subCategory` field (not in API). Add `shopId` field (required by `ProductRequest`; default to `1` for the admin panel's single shop).

**AddCategoryComponent** — remove `parentCategory`, `displayOrder`, `description`, `uploadedImage` fields that have no backend mapping. Keep only `name` and `isActive` (mapped from a toggle).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Error message extraction from backend payloads

*For any* non-2xx HTTP response from the backend — whether it carries a `{ message }` business error or a `{ errors }` validation map — the error-parsing utility SHALL return a non-empty, human-readable string.

**Validates: Requirements 1.3**

---

### Property 2: OTP generate triggers correct HTTP call

*For any* valid phone number string, calling `AuthService.generateOtp(phoneNumber)` SHALL result in an HTTP POST to `/app/auth/otp/generate` with a body of `{ phoneNumber }`.

**Validates: Requirements 2.1**

---

### Property 3: OTP verify triggers correct HTTP call

*For any* valid phone number and OTP code pair, calling `AuthService.verifyOtp(phoneNumber, otpCode, rememberMe)` SHALL result in an HTTP POST to `/app/auth/otp/verify` with a body of `{ phoneNumber, otpCode }`.

**Validates: Requirements 2.3**

---

### Property 4: Session persistence after successful OTP verification

*For any* `OtpVerifyResponse` returned by the backend, after `verifyOtp` completes successfully, reading the session from `localStorage` (or `sessionStorage` when `rememberMe` is false) SHALL return an `AdminSession` whose `userId` and `token` match the response values.

**Validates: Requirements 2.4**

---

### Property 5: Logout clears session (round-trip)

*For any* stored `AdminSession`, after `AuthService.logout()` is called, both `localStorage` and `sessionStorage` SHALL contain no session entry, and `isAuthenticated` SHALL return `false`.

**Validates: Requirements 2.7**

---

### Property 6: AuthGuard redirects unauthenticated users

*For any* protected route path (`/dashboard`, `/products`, `/products/new`, `/categories`, `/categories/new`), when `isAuthenticated` is `false`, the `authGuard` SHALL return a `UrlTree` pointing to `/login`.

**Validates: Requirements 3.3**

---

### Property 7: Dashboard reflects all HomeResponse collections

*For any* `HomeResponse` object returned by `DashboardService.getHomeData()`, the dashboard component's state signals SHALL contain the same `banners`, `categories`, `popularItems`, and `featuredItems` arrays as the response (same length and same item identities).

**Validates: Requirements 4.2, 4.3, 4.4, 4.5**

---

### Property 8: Products list reflects API response

*For any* array of `ProductResponse` objects returned by `ProductService.getProducts()`, the products-list component's displayed products signal SHALL contain entries with matching `id`, `name`, `price`, `stockStatus`, and `isAvailable` values.

**Validates: Requirements 5.2**

---

### Property 9: Search query triggers correct HTTP call

*For any* non-empty search string, calling `ProductService.searchProducts(query)` SHALL result in an HTTP GET to `/api/products/search` with a `name` query parameter equal to the search string.

**Validates: Requirements 5.3**

---

### Property 10: Add-product FormData contains required parts

*For any* valid `ProductRequest` object and optional `File`, calling `ProductService.createProduct(dto, image)` SHALL build a `FormData` that contains a `productRequestDTO` part (JSON-serialized) and, when an image is provided, an `image` part containing the file.

**Validates: Requirements 6.1**

---

### Property 11: Field-level validation errors are displayed (products)

*For any* `ApiValidationError` response from `POST /api/products`, every key in the `errors` map SHALL have a corresponding non-empty error message rendered in the add-product form.

**Validates: Requirements 6.4**

---

### Property 12: Category dropdown matches API response

*For any* array of `CategoryResponse` objects returned by `CategoryService.getCategories()`, the add-product form's category dropdown options SHALL contain exactly the same `id`/`name` pairs as the response.

**Validates: Requirements 6.7**

---

### Property 13: Categories list reflects API response

*For any* array of `CategoryResponse` objects returned by `CategoryService.getCategories()`, the categories-list component's displayed categories signal SHALL contain entries with matching `id`, `name`, and `isActive` values.

**Validates: Requirements 7.2**

---

### Property 14: Add-category sends correct JSON body

*For any* valid `CategoryRequest` (`name` non-empty, `isActive` boolean), calling `CategoryService.createCategory(dto)` SHALL result in an HTTP POST to `/api/categories` with a JSON body equal to `{ name, isActive }`.

**Validates: Requirements 8.1**

---

### Property 15: Field-level validation errors are displayed (categories)

*For any* `ApiValidationError` response from `POST /api/categories`, every key in the `errors` map SHALL have a corresponding non-empty error message rendered in the add-category form.

**Validates: Requirements 8.3**

---

### Property 16: Interceptor attaches Bearer token to every request

*For any* outgoing HTTP request made while a valid `AdminSession` is stored, the interceptor SHALL add an `Authorization` header with value `Bearer <token>` matching the stored token.

**Validates: Requirements 9.1**

---

## Error Handling

### HTTP Error Parsing Utility

A shared `parseApiError(error: HttpErrorResponse): string` function handles both error shapes:

```typescript
export function parseApiError(error: HttpErrorResponse): string {
  const body = error.error;
  if (body?.message) return body.message;
  if (body?.errors) {
    return Object.entries(body.errors)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join('; ');
  }
  return `Request failed (${error.status})`;
}
```

### Component Error State Pattern

Each component that makes HTTP calls uses a consistent signal pattern:

```typescript
isLoading = signal(false);
errorMessage = signal('');

loadData() {
  this.isLoading.set(true);
  this.errorMessage.set('');
  this.service.getData().subscribe({
    next: (data) => { this.data.set(data); this.isLoading.set(false); },
    error: (err) => { this.errorMessage.set(parseApiError(err)); this.isLoading.set(false); }
  });
}
```

### 401 Handling

The `AuthInterceptor` catches `HttpErrorResponse` with `status === 401` and calls `AuthService.logout()`, which clears storage and navigates to `/login`. This prevents stale sessions from silently failing.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are used. Unit tests cover specific examples, edge cases, and error conditions. Property-based tests verify universal correctness across generated inputs.

### Testing Framework

- **Unit tests**: Vitest (already in `devDependencies`) with Angular's `TestBed`
- **Property-based tests**: [fast-check](https://github.com/dubzzz/fast-check) — a mature TypeScript PBT library

Install: `npm install --save-dev fast-check`

### Property Test Configuration

Each property test runs a minimum of **100 iterations** via fast-check's `fc.assert(fc.property(...))`.

Tag format for each test:
```
// Feature: amarbazaar-api-integration, Property N: <property title>
```

### Unit Test Coverage

Unit tests focus on:
- `parseApiError` with specific `{ message }` and `{ errors }` payloads (edge cases: empty body, network error)
- `AuthService` state transitions: initial load from storage, post-login state, post-logout state
- `authGuard` and `guestGuard` with mocked `AuthService`
- Component loading/error states with mocked services
- `AuthInterceptor` 401 handling with a mocked `AuthService`

### Property Test Coverage

Each of the 16 correctness properties above maps to exactly one property-based test. The fast-check arbitraries used:

| Property | Arbitrary |
|---|---|
| 1 | `fc.oneof(fc.record({message: fc.string()}), fc.record({errors: fc.dictionary(fc.string(), fc.string())}))` |
| 2, 3 | `fc.string()` for phone/OTP values |
| 4, 5 | `fc.record({userId: fc.uuid(), token: fc.string(), isNewUser: fc.boolean()})` |
| 6 | `fc.constantFrom('/dashboard', '/products', '/products/new', '/categories', '/categories/new')` |
| 7 | `fc.record({banners: fc.array(...), categories: fc.array(...), popularItems: fc.array(...), featuredItems: fc.array(...)})` |
| 8, 13 | `fc.array(fc.record({id: fc.integer(), name: fc.string(), ...}))` |
| 9 | `fc.string({minLength: 1})` |
| 10 | `fc.record({categoryId: fc.integer(), name: fc.string(), ...})` with optional `fc.option(fc.object())` for file |
| 11, 15 | `fc.dictionary(fc.string(), fc.string())` for errors map |
| 12 | `fc.array(fc.record({id: fc.integer(), name: fc.string()}))` |
| 14 | `fc.record({name: fc.string({minLength: 1}), isActive: fc.boolean()})` |
| 16 | `fc.string({minLength: 1})` for token |
