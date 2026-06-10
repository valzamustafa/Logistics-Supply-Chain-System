# Logjistika

Logjistika is a supply-chain and logistics management platform built with a React frontend, .NET microservices, an Ocelot API gateway, SQL Server databases, MongoDB logging/tracking support, Redis caching, JWT authentication, SignalR real-time updates, and Stripe payment integration.

## Main Features

- Authentication, user management, roles, and permissions
- Product catalog with categories, images, and reviews
- Customer orders, invoices, payments, and warehouse/order workflow
- Inventory stock, reservations, deductions, releases, restores, and low-stock alerts
- Warehouse management with zones, staff, stock assignment, transfers, and reports
- Supplier management, supplier products, requests, invitations, purchase orders, emergency purchases, payments, and invoices
- Shipment management with drivers, vehicles, live tracking, delivery confirmation, and driver dashboard endpoints
- Notifications and chat through REST APIs and SignalR hubs
- Reports, analytics summaries, dashboard data, PDF export, and real-time dashboard hub
- Settings service for configurable company/system settings
- Tracking service for shipment tracking status and delivery data

## Technology Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Axios, React Router, i18next, SignalR client
- Backend: .NET microservices, Entity Framework Core, SQL Server
- Gateway: Ocelot API Gateway
- Databases: Microsoft SQL Server, MongoDB, Redis
- Authentication: JWT Bearer tokens
- Payments: Stripe
- Documentation: Swagger/OpenAPI, Markdown API documentation, Mermaid ERD
- Containerization: Docker Compose

## Repository Structure

```text
Logistics-Supply=Chain-System/
  frontend/                         React/Vite frontend
  Server/
    api-gateway/                    Ocelot gateway
    services/
      auth-service/                 Users, roles, permissions, JWT
      product-service/              Products, categories, images, reviews
      order-service/                Orders, payments, invoices, workflow
      inventory-service/            Inventory and stock movements
      warehouse-service/            Warehouses, zones, staff, warehouse stock
      supplier-service/             Suppliers and purchase orders
      shipment-service/             Shipments, drivers, vehicles
      notification-service/         Notifications, chat, SignalR hubs
      report-service/               Reports, analytics, dashboard hub
      tracking-services/            Shipment tracking
      settings-service/             System settings
    docker-compose.yml              Full local backend environment
  API_DOCUMENTATION.md              Endpoint and Swagger documentation
  
```

## Prerequisites

Install these before running the project:

- Docker Desktop with Docker Compose
- Node.js 18 or newer
- npm
- .NET SDK 9 for most services
- .NET SDK 8 for `settings-service` compatibility
- Git

## Quick Start With Docker

The recommended way to run the backend is Docker Compose.

```powershell
cd Server
docker compose up -d --build
```

Then run the frontend:

```powershell
cd ..\frontend
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:5000`
- Gateway Swagger UI: `http://localhost:5000/swagger/index.html`

## Service URLs

| Component | URL |
| --- | --- |
| API Gateway | `http://localhost:5000` |
| Frontend | `http://localhost:5173` |
| Auth Service Swagger | `http://localhost:5001/swagger/index.html` |
| Order Service Swagger | `http://localhost:5002/swagger/index.html` |
| Inventory Service Swagger | `http://localhost:5003/swagger/index.html` |
| Shipment Service Swagger | `http://localhost:5004/swagger/index.html` |
| Product Service Swagger | `http://localhost:5005/swagger/index.html` |
| Warehouse Service Swagger | `http://localhost:5006/swagger/index.html` |
| Supplier Service Swagger | `http://localhost:5007/swagger/index.html` |
| Report Service Swagger | `http://localhost:5008/swagger/index.html` |
| Notification Service Swagger | `http://localhost:5009/swagger/index.html` |
| Tracking Service Swagger | `http://localhost:5010/swagger/index.html` |
| Settings Service Swagger | `http://localhost:5011/swagger/index.html` |
| SQL Server | `localhost:1433` |
| MongoDB | `localhost:27017` |
| Redis | `localhost:6379` |

## Docker Services

`Server/docker-compose.yml` starts:

- `mssql`
- `mongodb`
- `redis`
- `auth-service`
- `product-service`
- `order-service`
- `inventory-service`
- `shipment-service`
- `warehouse-service`
- `supplier-service`
- `notification-service`
- `report-service`
- `tracking-services`
- `settings-service`
- `api-gateway`

## Database Names

| Service | Database |
| --- | --- |
| Auth | `LogjistikaDB` |
| Product | `LogjistikaDB` |
| Order | `LogjistikaDB` |
| Inventory | `LogjistikaDB` |
| Shipment | `LogjistikaDB` |
| Warehouse | `LogjistikaDB` |
| Supplier | `LogjistikaDB` |
| Notification | `LogjistikaDB` |
| Report | `LogjistikaDB` |
| Tracking | `LogjistikaDB` |
| Settings | `LogjistikaDB` |
| Mongo logging/tracking support | `SupplyChainLogsDB` |

## Configuration

### Backend

Docker Compose injects the required environment variables for each service, including SQL Server connection strings, JWT settings, Redis settings, and service URLs.

Important values from `Server/docker-compose.yml`:

- SQL Server user: `sa`
- SQL Server password: `YourStrong!Password123`
- JWT issuer: `Logjistika`
- JWT audience: `LogjistikaClients`
- Gateway base URL: `http://localhost:5000`

### Frontend

The frontend uses these optional environment variables:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_NOTIFICATION_API_URL=http://localhost:5000
VITE_SETTINGS_API_URL=http://localhost:5000/api
VITE_DASHBOARD_HUB_URL=http://localhost:5008/dashboardHub
VITE_STRIPE_PUBLISHABLE_KEY=<stripe_publishable_key>
```

If `VITE_API_BASE_URL` is not set, most frontend services default to `http://localhost:5000`.

## Authentication

The auth service seeds an initial admin user:

```text
Email: admin@logjistika.com
Password: Admin123!
Role: Admin
```

Protected API requests use:

```http
Authorization: Bearer <jwt-token>
```

## Running Backend Services Without Docker

Start dependencies first: SQL Server, MongoDB, and Redis. Then run the gateway and each service in separate terminals.

```powershell
dotnet run --project Server\api-gateway\api-gateway.csproj
dotnet run --project Server\services\auth-service\auth-service.csproj
dotnet run --project Server\services\product-service\product-service.csproj
dotnet run --project Server\services\order-service\order-service.csproj
dotnet run --project Server\services\inventory-service\inventory-service.csproj
dotnet run --project Server\services\shipment-service\shipment-service.csproj
dotnet run --project Server\services\warehouse-service\warehouse-service.csproj
dotnet run --project Server\services\supplier-service\supplier-service.csproj
dotnet run --project Server\services\notification-service\notification-service.csproj
dotnet run --project Server\services\report-service\report-service.csproj
dotnet run --project Server\services\tracking-services\tracking-service.csproj
dotnet run --project Server\services\settings-service\settings-service.csproj
```

When the gateway is run locally outside Docker, it resolves downstream services to `localhost` and the mapped development ports.

## Useful Commands

```powershell
# Start all backend containers
cd Server
docker compose up -d --build

# Stop all backend containers
docker compose down

# Show container status
docker compose ps

# View gateway logs
docker compose logs --tail=160 api-gateway

# Build frontend
cd ..\frontend
npm run build
```

## API Documentation

See `API_DOCUMENTATION.md` for the full endpoint list and Swagger/OpenAPI links.

Important Swagger URLs:

- Gateway Swagger UI: `http://localhost:5000/swagger/index.html`
- Gateway OpenAPI JSON: `http://localhost:5000/swagger/v1/swagger.json`
- Individual service Swagger documents are available on ports `5001` through `5011`.

