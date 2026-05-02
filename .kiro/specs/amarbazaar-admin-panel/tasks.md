# Implementation Plan: AmarBazaar Admin Panel — API Integration

## Overview

Incremental integration of the existing Angular 21 admin panel with the live Spring Boot backend. Each task builds on the previous one, starting with the HTTP foundation and ending with all components wired to real APIs.

## Tasks

- [x] 1. Bootstrap HTTP infrastructure
  - Create `src/environments/environment.ts` exporting `{ apiBaseUrl: 'http://localhost:8080' }`
  - Add `provideHttpClient(withInterceptorsFromDi())` to `app.config.ts`
  - Create `src/app/core/models/api.models.ts` with all TypeScript interfaces (`AdminSession`, `ProductRequest`, `ProductResponse`, `CategoryRequest`, `CategoryResponse`, `BannerResponse`, `HomeResponse`, `OtpGenerateRequest`, `OtpVerifyRequest`, `OtpVerifyResponse`, `ApiValidationError`, `ApiBusinessError`)
  - Create `src/app/core/utils/api-error.util.ts` with `parseApiError(error: HttpErrorResponse): string`
  - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.1 Write property test for parseApiError
    - **Property 1: Error message extraction from backend payloads**
    - **Validates: Requirements 1.3**
    - Use `fc.oneof` to generate both `{ message }` and `{ errors }` shapes; assert result is a non-empty string

- [x] 2. Implement AuthInterceptor and rewrite AuthService
  - Create `src/app/core/interceptors/auth.interceptor.ts` as a class-based `HttpInterceptor`
    - Read token from `localStorage` / `sessionStorage` using the `LS_KEY`
    - Clone request with `Authorization: Bearer <token>` header when token exists
    - On `HttpErrorResponse` with `status === 401`, call `AuthService.logout()`
  - Register interceptor in `app.config.ts` via `{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }`
  - Rewrite `src/app/core/services/auth.service.ts`:
    - Replace `AuthUser` interface with `AdminSession { userId, token, phoneNumber }`
    - Add `generateOtp(phoneNumber: string): Observable<void>` calling `POST /app/auth/otp/generate`
    - Add `verifyOtp(phoneNumber, otpCode, rememberMe): Observable<void>` calling `POST /app/auth/otp/verify`; on success persist `AdminSession` and set `_user` signal
    - Keep `logout()` — clear both storages, reset signal, navigate to `/login`
    - Keep `isAuthenticated` and `currentUser` computed signals
  - _Requirements: 2.1, 2.3, 2.4, 2.7, 9.1, 9.2_

  - [ ]* 2.1 Write property test for OTP generate HTTP call
    - **Property 2: OTP generate triggers correct HTTP call**
    - **Validates: Requirements 2.1**
    - Use `HttpClientTestingModule`; for any phone string assert POST body equals `{ phoneNumber }`

  - [ ]* 2.2 Write property test for OTP verify HTTP call
    - **Property 3: OTP verify triggers correct HTTP call**
    - **Validates: Requirements 2.3**
    - For any phone + OTP pair assert POST body equals `{ phoneNumber, otpCode }`

  - [ ]* 2.3 Write property test for session persistence
    - **Property 4: Session persistence after successful OTP verification**
    - **Validates: Requirements 2.4**
    - For any `OtpVerifyResponse`, after `verifyOtp` completes, assert stored session matches response

  - [ ]* 2.4 Write property test for logout round-trip
    - **Property 5: Logout clears session**
    - **Validates: Requirements 2.7**
    - For any stored `AdminSession`, after `logout()`, assert both storages are empty and `isAuthenticated` is false

  - [ ]* 2.5 Write property test for interceptor token attachment
    - **Property 16: Interceptor attaches Bearer token to every request**
    - **Validates: Requirements 9.1**
    - For any token string stored in session, assert every intercepted request has `Authorization: Bearer <token>`

- [x] 3. Update login component to OTP flow
  - Replace the single-step username/password form in `login.component.ts` and `login.component.html` with a two-step form:
    - Step 1: phone number input + "Send OTP" button → calls `AuthService.generateOtp()`
    - Step 2: OTP code input + "Verify" button → calls `AuthService.verifyOtp()`
  - Add `step = signal<'phone' | 'otp'>('phone')` and `phoneNumber = signal('')` and `otpCode = signal('')`
  - Show backend error messages from `parseApiError` on each step
  - Keep `isLoading` and `rememberMe` signals
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Apply route guards
  - In `app.routes.ts`, add `canActivate: [authGuard]` to `/dashboard`, `/products`, `/products/new`, `/categories`, `/categories/new`
  - Add `canActivate: [guestGuard]` to `/login`
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 4.1 Write property test for authGuard
    - **Property 6: AuthGuard redirects unauthenticated users**
    - **Validates: Requirements 3.3**
    - For each protected route path, when `isAuthenticated` is false, assert guard returns UrlTree to `/login`

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create DashboardService and wire dashboard component
  - Create `src/app/core/services/dashboard.service.ts`
    - Inject `HttpClient` and `environment.apiBaseUrl`
    - `getHomeData(): Observable<HomeResponse>` → `GET /app/home`
  - Update `dashboard.component.ts`:
    - Inject `DashboardService`
    - Add `homeData = signal<HomeResponse | null>(null)`, `isLoading = signal(false)`, `errorMessage = signal('')`
    - On `ngOnInit`, call `dashboardService.getHomeData()` and populate signals
    - Remove hardcoded `stats`, `activities`, `merchants` arrays (or keep as fallback placeholders)
  - Update `dashboard.component.html` to render `homeData().banners`, `homeData().categories`, `homeData().popularItems`, `homeData().featuredItems` with `@if` loading/error states
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 6.1 Write property test for dashboard data reflection
    - **Property 7: Dashboard reflects all HomeResponse collections**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
    - For any `HomeResponse`, after service emits, assert component signals contain matching arrays

- [x] 7. Create ProductService and wire products-list component
  - Create `src/app/core/services/product.service.ts`
    - `getProducts(): Observable<ProductResponse[]>` → `GET /api/products`
    - `searchProducts(name: string): Observable<ProductResponse[]>` → `GET /api/products/search?name={name}`
    - `getProduct(id: number): Observable<ProductResponse>` → `GET /api/products/{id}`
    - `createProduct(dto: ProductRequest, image?: File): Observable<ProductResponse>` → `POST /api/products` multipart
  - Update `products-list.component.ts`:
    - Remove local `Product` interface and hardcoded `allProducts` array
    - Add `products = signal<ProductResponse[]>([])`, `isLoading = signal(false)`, `errorMessage = signal('')`
    - On `ngOnInit`, call `productService.getProducts()` and populate `products` signal
    - Wire `searchQuery` changes (debounced 300ms) to call `productService.searchProducts(query)` when non-empty, else `getProducts()`
    - Update `filtered`, `paginated`, `totalPages` computed signals to work from `products` signal
  - Update `products-list.component.html` to use `ProductResponse` fields (`stockStatus` instead of `stockLabel`, `isAvailable` instead of `active`, `imageUrl` for image)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 7.1 Write property test for products list data reflection
    - **Property 8: Products list reflects API response**
    - **Validates: Requirements 5.2**
    - For any array of `ProductResponse`, assert component `products` signal contains matching entries

  - [ ]* 7.2 Write property test for search HTTP call
    - **Property 9: Search query triggers correct HTTP call**
    - **Validates: Requirements 5.3**
    - For any non-empty string, assert `searchProducts(query)` calls GET with correct `name` param

- [x] 8. Wire add-product component to ProductService
  - Update `add-product.component.ts`:
    - Inject `ProductService` and `CategoryService`
    - Replace hardcoded `categories` array with `categories = signal<CategoryResponse[]>([])` populated from `CategoryService.getCategories()` on init
    - Remove `subCategory` signal (no backend mapping)
    - Add `shopId = signal(1)` (single-shop default)
    - Add `fieldErrors = signal<Record<string, string>>({})`, `isLoading = signal(false)`, `errorMessage = signal('')`
    - In `onSave()`, build `ProductRequest` from signals and call `ProductService.createProduct(dto, imageFile)`
    - On success, navigate to `/products`
    - On `ApiValidationError`, populate `fieldErrors` signal; on business error, set `errorMessage`
    - Disable submit button while `isLoading` is true
  - Update `add-product.component.html` to show `fieldErrors` next to each input and `errorMessage` at top
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 8.1 Write property test for createProduct FormData
    - **Property 10: Add-product FormData contains required parts**
    - **Validates: Requirements 6.1**
    - For any `ProductRequest` + optional File, assert FormData has `productRequestDTO` part and `image` part when file provided

  - [ ]* 8.2 Write property test for field-level validation errors (products)
    - **Property 11: Field-level validation errors are displayed (products)**
    - **Validates: Requirements 6.4**
    - For any `errors` map, assert every key has a corresponding non-empty error in `fieldErrors` signal

  - [ ]* 8.3 Write property test for category dropdown population
    - **Property 12: Category dropdown matches API response**
    - **Validates: Requirements 6.7**
    - For any `CategoryResponse[]`, assert dropdown options match the array's `id`/`name` pairs

- [x] 9. Create CategoryService and wire categories-list component
  - Create `src/app/core/services/category.service.ts`
    - `getCategories(): Observable<CategoryResponse[]>` → `GET /api/categories`
    - `getCategory(id: number): Observable<CategoryResponse>` → `GET /api/categories/{id}`
    - `createCategory(dto: CategoryRequest): Observable<CategoryResponse>` → `POST /api/categories`
  - Update `categories-list.component.ts`:
    - Remove local `Category` / `SubCategory` interfaces and hardcoded `categories` signal value
    - Add `categories = signal<CategoryResponse[]>([])`, `isLoading = signal(false)`, `errorMessage = signal('')`
    - On `ngOnInit`, call `categoryService.getCategories()` and populate `categories` signal
    - Update `filtered`, `paginated`, `totalPages` computed signals to work from `categories` signal
    - Remove `toggleExpand` and `toggleActive` methods that relied on removed fields
  - Update `categories-list.component.html` to render `id`, `name`, `isActive` from `CategoryResponse`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 9.1 Write property test for categories list data reflection
    - **Property 13: Categories list reflects API response**
    - **Validates: Requirements 7.2**
    - For any `CategoryResponse[]`, assert component `categories` signal contains matching entries

- [x] 10. Wire add-category component to CategoryService
  - Update `add-category.component.ts`:
    - Inject `CategoryService`
    - Remove `parentCategory`, `displayOrder`, `description`, `uploadedImage`, `dragOver` signals (no backend mapping)
    - Add `isActive = signal(true)`, `fieldErrors = signal<Record<string, string>>({})`, `isLoading = signal(false)`, `errorMessage = signal('')`
    - In `onSave()`, call `CategoryService.createCategory({ name: categoryName(), isActive: isActive() })`
    - On success, navigate to `/categories`
    - On `ApiValidationError`, populate `fieldErrors`; on business error, set `errorMessage`
    - Disable submit button while `isLoading` is true
  - Update `add-category.component.html` to show `fieldErrors`, `errorMessage`, and an `isActive` toggle
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 10.1 Write property test for createCategory HTTP body
    - **Property 14: Add-category sends correct JSON body**
    - **Validates: Requirements 8.1**
    - For any `CategoryRequest`, assert `createCategory` calls POST with matching JSON body

  - [ ]* 10.2 Write property test for field-level validation errors (categories)
    - **Property 15: Field-level validation errors are displayed (categories)**
    - **Validates: Requirements 8.3**
    - For any `errors` map, assert every key has a corresponding non-empty error in `fieldErrors` signal

- [x] 11. Wire sidebar logout button
  - Update `sidebar.component.html` to add a "Logout" button that calls `auth.logout()`
  - Ensure the button is visible and accessible in the sidebar nav
  - _Requirements: 2.7_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use **fast-check** (`npm install --save-dev fast-check`)
- Unit tests use **Vitest** + Angular `TestBed` (already configured)
- `shopId` defaults to `1` in the add-product form — update if multi-shop support is needed later
