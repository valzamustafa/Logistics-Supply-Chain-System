# API Documentation

This document lists the active REST endpoints exposed by the Logjistika backend services and routed through the API Gateway.

## Base URL

Use the gateway for frontend and external API calls:

```text
http://localhost:5000
```

Each endpoint below is shown as a gateway path unless noted otherwise.

## Swagger / OpenAPI

| Component | Swagger UI | OpenAPI JSON |
| --- | --- | --- |
| API Gateway | `http://localhost:5000/swagger/index.html` | `http://localhost:5000/swagger/v1/swagger.json` |
| Auth Service | `http://localhost:5001/swagger/index.html` | `http://localhost:5001/swagger/v1/swagger.json` |
| Order Service | `http://localhost:5002/swagger/index.html` | `http://localhost:5002/swagger/v1/swagger.json` |
| Inventory Service | `http://localhost:5003/swagger/index.html` | `http://localhost:5003/swagger/v1/swagger.json` |
| Shipment Service | `http://localhost:5004/swagger/index.html` | `http://localhost:5004/swagger/v1/swagger.json` |
| Product Service | `http://localhost:5005/swagger/index.html` | `http://localhost:5005/swagger/v1/swagger.json` |
| Warehouse Service | `http://localhost:5006/swagger/index.html` | `http://localhost:5006/swagger/v1/swagger.json` |
| Supplier Service | `http://localhost:5007/swagger/index.html` | `http://localhost:5007/swagger/v1/swagger.json` |
| Report Service | `http://localhost:5008/swagger/index.html` | `http://localhost:5008/swagger/v1/swagger.json` |
| Notification Service | `http://localhost:5009/swagger/index.html` | `http://localhost:5009/swagger/v1/swagger.json` |
| Tracking Service | `http://localhost:5010/swagger/index.html` | `http://localhost:5010/swagger/v1/swagger.json` |
| Settings Service | `http://localhost:5011/swagger/index.html` | `http://localhost:5011/swagger/v1/swagger.json` |

Postman import: start the backend, open Postman, choose Import, and import the OpenAPI JSON from the gateway or from an individual service URL above.

## Authentication

Protected endpoints require a JWT token:

```http
Authorization: Bearer <token>
```



## Gateway Route Groups

| Gateway path | Downstream service |
| --- | --- |
| `/api/auth/**` | Auth Service |
| `/api/products/**` and `/images/**` | Product Service |
| `/api/orders/**` | Order Service |
| `/api/inventory/**` | Inventory Service |
| `/api/shipments/**`, `/api/drivers/**`, `/api/vehicles/**`, `/api/driver/**` | Shipment Service |
| `/api/warehouses/**`, `/api/warehousestock/**` | Warehouse Service |
| `/api/suppliers/**`, `/api/purchaseorders/**` | Supplier Service |
| `/api/notifications/**`, `/api/chat/**`, `/notificationsHub`, `/chatHub` | Notification Service |
| `/api/reports/**`, `/dashboardHub` | Report Service |
| `/api/tracking/**` | Tracking Service |
| `/api/settings/**` | Settings Service |

## Auth Service

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Login and receive tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current authenticated user |
| GET | `/api/auth/users` | List users |
| GET | `/api/auth/users/chat` | List users for chat |
| GET | `/api/auth/{id}` | Get user by id |
| PUT | `/api/auth/{id}` | Update user |
| DELETE | `/api/auth/{id}` | Delete user |
| POST | `/api/auth/{userId}/roles/{roleId}` | Assign role to user |
| DELETE | `/api/auth/{userId}/roles/{roleId}` | Remove role from user |
| GET | `/api/auth/permissions` | List permissions |
| PUT | `/api/auth/roles/{roleId}/permissions` | Update role permissions |
| GET | `/api/auth/roles` | List roles |
| POST | `/api/auth/roles` | Create role |
| PUT | `/api/auth/roles/{id}` | Update role |
| DELETE | `/api/auth/roles/{id}` | Delete role |
| GET | `/api/auth/users/by-email/{email}` | Find user by email |
| GET | `/api/auth/roles/{roleName}/users` | List users by role |
| POST | `/api/auth/roles/users/by-roles` | List users by multiple roles |
| GET | `/api/auth/users/details/{id}` | Get detailed user profile |
| GET | `/api/auth/users/exists/{email}` | Check if user exists |

## Product Service

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/products` | List products |
| GET | `/api/products/{id}` | Get product by id |
| GET | `/api/products/sku/{sku}` | Get product by SKU |
| GET | `/api/products/category/{categoryId}` | List products by category |
| POST | `/api/products` | Create product |
| PUT | `/api/products/{id}` | Update product |
| DELETE | `/api/products/{id}` | Delete product |
| POST | `/api/products/{id}/images` | Upload product image |
| DELETE | `/api/products/{id}/images/{imageId}` | Delete product image |
| GET | `/api/products/categories` | List categories |
| POST | `/api/products/categories` | Create category |
| GET | `/images/{file}` | Serve uploaded product images |

## Order Service

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/{id}` | Get order by id |
| GET | `/api/orders/{id}/invoice` | Generate/download invoice |
| GET | `/api/orders/user/{userId}` | List orders by user |
| POST | `/api/orders` | Create order |
| POST | `/api/orders/payment-intent` | Create Stripe payment intent |
| PUT | `/api/orders/{id}/status` | Update order status |
| POST | `/api/orders/{id}/cancel` | Cancel order |
| POST | `/api/orders/{id}/select-warehouse` | Select warehouse for order |
| PUT | `/api/orders/{id}/assign-warehouse/{warehouseId}` | Assign warehouse |
| GET | `/api/orders/{id}/validate-inventory` | Validate order inventory |
| POST | `/api/orders/{id}/reserve-inventory` | Reserve inventory |
| POST | `/api/orders/{id}/start-processing` | Start warehouse processing |
| POST | `/api/orders/{id}/complete-picking` | Complete picking |
| POST | `/api/orders/{id}/complete-packing` | Complete packing |
| POST | `/api/orders/{id}/create-shipment` | Create shipment for order |
| POST | `/api/orders/{id}/mark-shipped/{shipmentId}` | Mark order as shipped |
| POST | `/api/orders/{id}/confirm-delivery` | Confirm delivery |
| POST | `/api/orders/{id}/delivery-failed` | Mark delivery failed |
| POST | `/api/orders/{id}/process-return` | Process return |
| POST | `/api/orders/{id}/restore-inventory` | Restore inventory |
| GET | `/api/orders/{id}/workflow-status` | Get order workflow status |

## Inventory Service

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/inventory` | List inventory |
| GET | `/api/inventory/{productId}/{warehouseId}` | Get inventory by product and warehouse |
| GET | `/api/inventory/warehouse/{warehouseId}` | List inventory by warehouse |
| POST | `/api/inventory/stock` | Update/add stock |
| GET | `/api/inventory/low-stock-alerts` | List low-stock alerts |
| GET | `/api/inventory/availability` | Check stock availability |
| POST | `/api/inventory/reserve` | Reserve stock |
| POST | `/api/inventory/release` | Release reserved stock |
| POST | `/api/inventory/deduct` | Deduct stock |
| POST | `/api/inventory/restore` | Restore stock |

## Shipment Service

### Shipments

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/shipments` | List shipments |
| GET | `/api/shipments/{id}` | Get shipment by id |
| GET | `/api/shipments/order/{orderId}` | Get shipment by order |
| POST | `/api/shipments` | Create shipment |
| GET | `/api/shipments/driver/assigned` | List shipments assigned to current driver |
| POST | `/api/shipments/{id}/start` | Start shipment |
| POST | `/api/shipments/{id}/complete` | Complete shipment |
| PUT | `/api/shipments/{id}/status` | Update shipment status |
| PUT | `/api/shipments/{id}/location` | Update shipment location |
| GET | `/api/shipments/{id}/tracking/live` | Get live shipment tracking |
| GET | `/api/shipments/performance` | Get shipment performance metrics |
| POST | `/api/shipments/{id}/notify-supplier` | Notify supplier about shipment |
| PUT | `/api/shipments/{id}/assign-driver` | Assign driver |
| PUT | `/api/shipments/{id}/reorder` | Reorder shipment |
| POST | `/api/shipments/broadcast-order-update` | Broadcast order update |

### Drivers

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/drivers` | List drivers |
| GET | `/api/drivers/available` | List available drivers |
| GET | `/api/drivers/{id}` | Get driver by id |
| POST | `/api/drivers` | Create driver |
| PUT | `/api/drivers/{id}` | Update driver |
| DELETE | `/api/drivers/{id}` | Delete driver |
| GET | `/api/driver/profile` | Get current driver profile |
| PUT | `/api/driver/availability` | Update driver availability |
| GET | `/api/driver/stats` | Get current driver statistics |
| GET | `/api/driver/schedule/today` | Get today's driver schedule |
| GET | `/api/driver/schedule/week` | Get weekly driver schedule |

### Vehicles

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/vehicles` | List vehicles |
| GET | `/api/vehicles/available` | List available vehicles |
| GET | `/api/vehicles/my` | List current driver's vehicles |
| GET | `/api/vehicles/{id}` | Get vehicle by id |
| GET | `/api/vehicles/{id}/tracking/live` | Get live vehicle tracking |
| GET | `/api/vehicles/driver/{driverId}` | List vehicles by driver |
| POST | `/api/vehicles` | Create vehicle |
| POST | `/api/vehicles/my` | Create current driver's vehicle |
| PUT | `/api/vehicles/{id}` | Update vehicle |
| PUT | `/api/vehicles/my/{id}` | Update current driver's vehicle |
| POST | `/api/vehicles/assign` | Assign vehicle to driver |
| DELETE | `/api/vehicles/{id}` | Delete vehicle |
| DELETE | `/api/vehicles/my/{id}` | Delete current driver's vehicle |

## Warehouse Service

### Warehouses

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/warehouses` | List warehouses |
| GET | `/api/warehouses/{id}` | Get warehouse by id |
| POST | `/api/warehouses` | Create warehouse |
| PUT | `/api/warehouses/{id}` | Update warehouse |
| DELETE | `/api/warehouses/{id}` | Delete warehouse |
| PUT | `/api/warehouses/{id}/toggle-status` | Activate/deactivate warehouse |
| GET | `/api/warehouses/{id}/stats` | Get warehouse statistics |
| GET | `/api/warehouses/summary` | Get warehouse summary |
| GET | `/api/warehouses/value-report` | Get warehouse value report |

### Warehouse Zones and Staff

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/warehouses/{warehouseId}/zones` | List zones |
| POST | `/api/warehouses/zones` | Create zone |
| PUT | `/api/warehouses/zones/{id}` | Update zone |
| DELETE | `/api/warehouses/zones/{id}` | Delete zone |
| GET | `/api/warehouses/{warehouseId}/staff` | List warehouse staff |
| POST | `/api/warehouses/{warehouseId}/staff` | Assign staff |
| PUT | `/api/warehouses/staff/{id}` | Update staff assignment |
| DELETE | `/api/warehouses/staff/{id}` | Remove staff assignment |
| GET | `/api/warehouses/staff/user/{userId}` | Get staff assignment by user |

### Warehouse Stock

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/warehouses/stock` | List warehouse stock |
| GET | `/api/warehouses/stock/{id}` | Get stock row by id |
| GET | `/api/warehouses/{warehouseId}/stock` | List stock by warehouse |
| GET | `/api/warehouses/product/{productId}/stock` | List stock by product |
| GET | `/api/warehouses/{warehouseId}/product/{productId}` | Get product stock in warehouse |
| POST | `/api/warehouses/{warehouseId}/assign` | Assign product to warehouse |
| PUT | `/api/warehouses/{warehouseId}/product/{productId}/stock` | Update warehouse product stock |
| DELETE | `/api/warehouses/{warehouseId}/product/{productId}` | Remove product from warehouse |
| POST | `/api/warehouses/transfer` | Transfer stock |
| GET | `/api/warehouses/{warehouseId}/product/{productId}/movements` | List stock movements |
| GET | `/api/warehouses/low-stock` | List low-stock warehouse items |
| GET | `/api/warehouses/{warehouseId}/inventory/{productId}` | Inventory compatibility endpoint |
| GET | `/api/warehouses/{warehouseId}/check-availability` | Check warehouse availability |
| POST | `/api/warehouses/warehouse/{warehouseId}/bulk-assign` | Bulk assign products |

### WarehouseStock Controller Alias

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/warehousestock` | List warehouse stock |
| GET | `/api/warehousestock/warehouse/{warehouseId}` | List stock by warehouse |
| GET | `/api/warehousestock/product/{productId}` | List stock by product |
| GET | `/api/warehousestock/warehouse/{warehouseId}/product/{productId}` | Get stock by warehouse and product |
| POST | `/api/warehousestock/warehouse/{warehouseId}/assign` | Assign product to warehouse |
| GET | `/api/warehousestock/warehouse/{warehouseId}/unassigned-products` | List unassigned products |
| PUT | `/api/warehousestock/warehouse/{warehouseId}/product/{productId}/stock` | Update stock |
| POST | `/api/warehousestock/transfer` | Transfer stock |
| GET | `/api/warehousestock/warehouse/{warehouseId}/product/{productId}/movements` | List movements |
| GET | `/api/warehousestock/low-stock` | List low-stock items |
| GET | `/api/warehousestock/warehouse/{warehouseId}/product/{productId}/availability` | Check availability |
| DELETE | `/api/warehousestock/warehouse/{warehouseId}/product/{productId}` | Remove product from warehouse |

## Supplier Service

### Suppliers

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/suppliers` | List suppliers |
| GET | `/api/suppliers/{id}` | Get supplier by id |
| GET | `/api/suppliers/{id}/products` | List supplier products |
| GET | `/api/suppliers/products/all` | List all supplier products |
| GET | `/api/suppliers/all-products` | List all products from suppliers |
| POST | `/api/suppliers/{id}/products` | Add supplier product |
| GET | `/api/suppliers/email/{email}` | Get supplier by email |
| POST | `/api/suppliers` | Create supplier |
| PUT | `/api/suppliers/{id}` | Update supplier |
| DELETE | `/api/suppliers/{id}` | Delete supplier |
| GET | `/api/suppliers/dashboard/me` | Get supplier dashboard |
| GET | `/api/suppliers/debug/claims` | Debug JWT claims |
| POST | `/api/suppliers/assign-to-warehouse` | Assign supplier to warehouse |

### Supplier Orders, Payments, Requests, Invitations

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/suppliers/orders` | List supplier orders |
| GET | `/api/suppliers/orders/{id}` | Get supplier order |
| POST | `/api/suppliers/orders` | Create supplier order |
| PUT | `/api/suppliers/orders/{id}/status` | Update supplier order status |
| POST | `/api/suppliers/orders/{id}/payments` | Add supplier order payment |
| GET | `/api/suppliers/orders/{id}/payments` | List supplier order payments |
| GET | `/api/suppliers/orders/{id}/invoice-pdf` | Generate supplier order invoice PDF |
| GET | `/api/suppliers/payments/{id}` | Get payment |
| POST | `/api/suppliers/requests` | Create supplier request |
| GET | `/api/suppliers/requests/pending` | List pending supplier requests |
| POST | `/api/suppliers/invitations` | Create invitation |
| POST | `/api/suppliers/invitations/register` | Register through invitation |
| POST | `/api/suppliers/emergency-purchases` | Create emergency purchase |
| PUT | `/api/suppliers/emergency-purchases/{id}/convert` | Convert emergency purchase |

### Purchase Orders

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/purchaseorders` | List purchase orders |
| GET | `/api/purchaseorders/{id}` | Get purchase order |
| POST | `/api/purchaseorders` | Create purchase order |
| POST | `/api/purchaseorders/{id}/confirm-shipment` | Confirm purchase order shipment |
| POST | `/api/purchaseorders/receive` | Receive purchase order |
| PUT | `/api/purchaseorders/{id}/update-status` | Update purchase order status |

## Notification and Chat Service

### Notifications

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/notifications/user/{userId}` | List notifications for user |
| GET | `/api/notifications/user/{userId}/unread` | List unread notifications |
| GET | `/api/notifications/user/{userId}/unread-count` | Get unread count |
| POST | `/api/notifications/send` | Send notification |
| POST | `/api/notifications/send-to-role` | Send notification to role |
| POST | `/api/notifications/send-bulk` | Send notification to multiple users |
| PUT | `/api/notifications/{id}/read` | Mark notification as read |
| PUT | `/api/notifications/user/{userId}/read-all` | Mark all user notifications as read |

### Chat

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/chat/conversation/{userA}/{userB}` | Get conversation between users |
| GET | `/api/chat/unread-count/{userId}` | Get unread chat count |
| GET | `/api/chat/conversations/{userId}` | List chat conversations |
| POST | `/api/chat/send` | Send chat message |
| POST | `/api/chat/mark-read/{userId}/{otherUserId}` | Mark conversation as read |

### SignalR Hubs

| Hub | URL |
| --- | --- |
| Notifications | `/notificationsHub` |
| Chat | `/chatHub` |

## Report Service

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/reports` | List reports |
| GET | `/api/reports/{id}` | Get report by id |
| GET | `/api/reports/type/{type}` | List reports by type |
| POST | `/api/reports/generate` | Generate report |
| DELETE | `/api/reports/{id}` | Delete report |
| GET | `/api/reports/summary` | Get report summary |
| GET | `/api/reports/{id}/pdf` | Export report as PDF |

SignalR dashboard hub:

```text
/dashboardHub
```

## Tracking Service

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/tracking` | List tracking records |
| GET | `/api/tracking/shipment/{shipmentId}` | Get tracking by shipment |
| POST | `/api/tracking` | Create tracking record |
| PUT | `/api/tracking/shipment/{shipmentId}/status` | Update shipment tracking status |
| PUT | `/api/tracking/shipment/{shipmentId}/deliver` | Mark shipment as delivered |

## Settings Service

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/settings` | List settings |
| GET | `/api/settings/{id}` | Get setting by id |
| GET | `/api/settings/key/{key}` | Get setting by key |
| GET | `/api/settings/system/config` | Get system configuration |
| POST | `/api/settings` | Create setting |
| PUT | `/api/settings/{id}` | Update setting |
| DELETE | `/api/settings/{id}` | Delete setting |

## Notes

- The gateway is the preferred public entry point.
- Individual service Swagger UIs provide request/response schemas generated from the running services.
- `AnalyticsController.cs`, `DashboardController.cs`, `StockController.cs`, and `TransferController.cs` are present but empty in the current source and therefore are not listed as active endpoints.
- SignalR hub URLs are proxied by the gateway, but browser/WebSocket behavior depends on gateway and service runtime configuration.
