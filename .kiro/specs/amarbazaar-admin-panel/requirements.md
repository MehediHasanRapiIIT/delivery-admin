# Requirements Document

## Introduction

This document defines the requirements for integrating real backend APIs into the AmarBazaar Admin Panel. The admin panel is an Angular 21 standalone-component application with existing UI for login, dashboard, products, and categories. All components currently use hardcoded mock data. This integration replaces mock data with live HTTP calls to a Spring Boot backend running at `http://localhost:8080`, wires up authentication guards, and adapts the UI data models to match the API contracts.

## Glossary

- **Admin_Panel**: The Angular 21 frontend application being integrated.
- **Backend**: The Spring Boot REST API server at `http://localhost:8080`.
- **AuthService**: The Angular service responsible for session management and authentication state.
- **ProductService**: The Angular service responsible for all product-related HTTP calls.
- **CategoryService**: The Angular service responsible for all category-related HTTP calls.
- **DashboardService**: The Angular service responsible for fetching home/dashboard data.
- **HttpClient**: Angular's built-in HTTP client, provided via `provideHttpClient()`.
- **OTP**: One-Time Password sent to a phone number for authentication.
- **JWT**: JSON Web Token returned by the backend upon successful OTP verification, used as a Bearer token in subsequent requests.
- **AuthGuard**: Angular route guard that redirects unauthenticated users to `/login`.
- **GuestGuard**: Angular route guard that redirects already-authenticated users away from `/login`.
- **ProductResponse**: The API response shape for a product: `{ id, categoryId, name, description, price, discountPrice, imageUrl, isAvailable, stockQuantity, stockStatus, avgRating, totalReviews }`.
- **CategoryResponse**: The API response shape for a category: `{ id, name, isActive }`.
- **BannerResponse**: The API response shape for a banner: `{ id, imageUrl, promotionTitle, promotionDetails, fromDate, toDate }`.
- **HomeResponse**: The API response shape for the home endpoint: `{ banners, categories, popularItems, featuredItems }`.
- **multipart/form-data**: HTTP content type used when uploading files alongside JSON data.

---

## Requirements

### Requirement 1: HTTP Client Bootstrap

**User Story:** As a developer, I want Angular's HttpClient configured globally, so that all services can make HTTP requests to the backend.

#### Acceptance Criteria

1. THE Admin_Panel SHALL include `provideHttpClient(withInterceptorsFromDi())` in `app.config.ts` so that `HttpClient` is injectable throughout the application.
2. THE Admin_Panel SHALL configure a base URL of `http://localhost:8080` as an environment constant so that all services reference it from a single source.
3. WHEN an HTTP request returns a non-2xx status code, THE Admin_Panel SHALL surface a user-readable error message derived from the backend error payload (`message` field or field-level `errors` map).

---

### Requirement 2: OTP-Based Admin Authentication

**User Story:** As an admin, I want to log in using my phone number and a one-time password, so that my identity is verified by the real backend.

#### Acceptance Criteria

1. WHEN an admin submits a valid phone number on the login page, THE AuthService SHALL call `POST /app/auth/otp/generate` with `{ phoneNumber }` and transition the UI to an OTP entry step.
2. IF `POST /app/auth/otp/generate` returns an error, THEN THE Admin_Panel SHALL display the backend error message and remain on the phone-entry step.
3. WHEN an admin submits a valid OTP code, THE AuthService SHALL call `POST /app/auth/otp/verify` with `{ phoneNumber, otpCode }`.
4. WHEN `POST /app/auth/otp/verify` succeeds, THE AuthService SHALL persist `{ userId, token }` to `localStorage` (or `sessionStorage` when "Remember Me" is unchecked) and navigate to `/dashboard`.
5. IF `POST /app/auth/otp/verify` returns an error, THEN THE Admin_Panel SHALL display the backend error message and remain on the OTP entry step.
6. THE Admin_Panel SHALL replace the existing username/password login form with a two-step phone-number → OTP form.
7. WHEN an authenticated admin clicks "Logout" in the sidebar, THE AuthService SHALL clear the stored session and navigate to `/login`.

---

### Requirement 3: Route Protection

**User Story:** As a system operator, I want all protected routes to require authentication, so that unauthenticated users cannot access admin pages.

#### Acceptance Criteria

1. THE Admin_Panel SHALL apply `authGuard` to the routes `/dashboard`, `/products`, `/products/new`, `/categories`, and `/categories/new` in `app.routes.ts`.
2. THE Admin_Panel SHALL apply `guestGuard` to the `/login` route so that already-authenticated users are redirected to `/dashboard`.
3. WHEN an unauthenticated user navigates to a protected route, THE AuthGuard SHALL redirect the user to `/login`.
4. WHEN an authenticated user navigates to `/login`, THE GuestGuard SHALL redirect the user to `/dashboard`.

---

### Requirement 4: Dashboard — Real Data from Home API

**User Story:** As an admin, I want the dashboard to display live data from the backend, so that I can monitor the current state of the platform.

#### Acceptance Criteria

1. WHEN the dashboard page loads, THE DashboardService SHALL call `GET /app/home` and return the `HomeResponse`.
2. THE Dashboard component SHALL display the list of banners from `HomeResponse.banners`.
3. THE Dashboard component SHALL display the list of categories from `HomeResponse.categories`.
4. THE Dashboard component SHALL display popular items from `HomeResponse.popularItems`.
5. THE Dashboard component SHALL display featured items from `HomeResponse.featuredItems`.
6. WHILE the home API call is in progress, THE Dashboard component SHALL display a loading indicator.
7. IF `GET /app/home` returns an error, THEN THE Dashboard component SHALL display an error message and retain any previously loaded data.

---

### Requirement 5: Products List — Real Data

**User Story:** As an admin, I want the products list to show real products from the backend, so that I can manage the actual product catalogue.

#### Acceptance Criteria

1. WHEN the products list page loads, THE ProductService SHALL call `GET /api/products` and return a list of `ProductResponse` objects.
2. THE Products_List component SHALL render each product's `name`, `price`, `discountPrice`, `imageUrl`, `isAvailable`, `stockQuantity`, and `stockStatus` from the API response.
3. WHEN a user types in the search field, THE ProductService SHALL call `GET /api/products/search?name={query}` and update the displayed list.
4. WHILE the products API call is in progress, THE Products_List component SHALL display a loading indicator.
5. IF `GET /api/products` returns an error, THEN THE Products_List component SHALL display an error message.
6. THE Products_List component SHALL remove the hardcoded `sku`, `unit`, and `categoryColor` fields from its internal data model and use only fields present in `ProductResponse`.

---

### Requirement 6: Add Product — Real Submission

**User Story:** As an admin, I want the add-product form to save new products to the backend, so that products appear in the live catalogue.

#### Acceptance Criteria

1. WHEN an admin submits the add-product form with valid data, THE ProductService SHALL call `POST /api/products` with a `multipart/form-data` body containing a `productRequestDTO` JSON part and an optional `image` file part.
2. THE Add_Product form SHALL collect `name`, `description`, `price`, `discountPercentage`, `categoryId`, `shopId`, and `isAvailable` fields that map directly to `ProductRequest`.
3. WHEN `POST /api/products` succeeds, THE Admin_Panel SHALL navigate to `/products`.
4. IF `POST /api/products` returns a validation error (`errors` map), THEN THE Add_Product component SHALL display field-level error messages next to the relevant inputs.
5. IF `POST /api/products` returns a business error (`message`), THEN THE Add_Product component SHALL display the error message at the top of the form.
6. WHILE the submission is in progress, THE Add_Product component SHALL disable the submit button and show a loading state.
7. THE Add_Product component SHALL populate the category dropdown from `GET /api/categories` rather than a hardcoded list.

---

### Requirement 7: Categories List — Real Data

**User Story:** As an admin, I want the categories list to show real categories from the backend, so that I can manage the actual category tree.

#### Acceptance Criteria

1. WHEN the categories list page loads, THE CategoryService SHALL call `GET /api/categories` and return a list of `CategoryResponse` objects.
2. THE Categories_List component SHALL render each category's `id`, `name`, and `isActive` from the API response.
3. WHILE the categories API call is in progress, THE Categories_List component SHALL display a loading indicator.
4. IF `GET /api/categories` returns an error, THEN THE Categories_List component SHALL display an error message.
5. THE Categories_List component SHALL remove the hardcoded `subCount`, `itemCount`, `icon`, `iconBg`, and `subCategories` fields from its internal data model and use only fields present in `CategoryResponse`.

---

### Requirement 8: Add Category — Real Submission

**User Story:** As an admin, I want the add-category form to save new categories to the backend, so that categories appear in the live catalogue.

#### Acceptance Criteria

1. WHEN an admin submits the add-category form with a valid name, THE CategoryService SHALL call `POST /api/categories` with `{ name, isActive }` as a JSON body.
2. WHEN `POST /api/categories` succeeds, THE Admin_Panel SHALL navigate to `/categories`.
3. IF `POST /api/categories` returns a validation error (`errors` map), THEN THE Add_Category component SHALL display field-level error messages.
4. IF `POST /api/categories` returns a business error (`message`), THEN THE Add_Category component SHALL display the error message at the top of the form.
5. WHILE the submission is in progress, THE Add_Category component SHALL disable the submit button and show a loading state.

---

### Requirement 9: HTTP Error Handling and Auth Token Injection

**User Story:** As a developer, I want a centralized HTTP interceptor, so that the JWT token is attached to every request and 401 responses trigger automatic logout.

#### Acceptance Criteria

1. THE Admin_Panel SHALL implement an HTTP interceptor that reads the stored JWT token and attaches it as an `Authorization: Bearer <token>` header to every outgoing request.
2. WHEN the backend returns a `401 Unauthorized` response, THE interceptor SHALL call `AuthService.logout()` and redirect the user to `/login`.
3. THE interceptor SHALL be registered via `withInterceptorsFromDi()` so it applies to all `HttpClient` calls.
