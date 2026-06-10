// mongo-init/init.js
// Kjo skriptë ekzekutohet kur MongoDB starton për herë të parë

// Përdor databazën e specifikuar
db = db.getSiblingDB('SupplyChainLogsDB');

// Krijo koleksionet nëse nuk ekzistojnë
db.createCollection('SystemLogs');
db.createCollection('ChatMessages');
db.createCollection('AuditTrails');
db.createCollection('RealTimeEvents');
db.createCollection('TrackingLogs');
db.createCollection('PerformanceMetrics');

// Krijo indekse për performancë
db.SystemLogs.createIndex({ Timestamp: -1 });
db.SystemLogs.createIndex({ Level: 1 });
db.SystemLogs.createIndex({ Service: 1 });

db.ChatMessages.createIndex({ FromUserId: 1, ToUserId: 1 });
db.ChatMessages.createIndex({ RoomId: 1 });
db.ChatMessages.createIndex({ SentAt: -1 });
db.ChatMessages.createIndex({ IsRead: 1 });

db.AuditTrails.createIndex({ CreatedAt: -1 });
db.AuditTrails.createIndex({ UserId: 1 });
db.AuditTrails.createIndex({ Entity: 1, EntityId: 1 });

db.RealTimeEvents.createIndex({ CreatedAt: -1 });
db.RealTimeEvents.createIndex({ UserId: 1 });
db.RealTimeEvents.createIndex({ EventType: 1 });

db.TrackingLogs.createIndex({ ShipmentId: 1, Timestamp: -1 });
db.TrackingLogs.createIndex({ Status: 1 });

db.PerformanceMetrics.createIndex({ Timestamp: -1 });
db.PerformanceMetrics.createIndex({ Endpoint: 1 });
db.PerformanceMetrics.createIndex({ StatusCode: 1 });

// Fut të dhëna fillestare (seed data)
const now = new Date();

db.SystemLogs.insertMany([
    {
        Level: "Info",
        Service: "OrderService",
        Message: "Order #2201 validated successfully.",
        UserId: 135,
        IpAddress: "192.168.10.5",
        Endpoint: "/api/orders/validate",
        Timestamp: new Date(now.getTime() - 18 * 60 * 1000)
    },
    {
        Level: "Warning",
        Service: "ShipmentService",
        Message: "Shipment #5401 delayed because of weather.",
        UserId: 221,
        IpAddress: "192.168.10.23",
        Endpoint: "/api/shipments/status",
        Timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    },
    {
        Level: "Error",
        Service: "AuthService",
        Message: "Failed login attempt for user 1024.",
        UserId: 1024,
        IpAddress: "10.0.0.12",
        Endpoint: "/api/auth/login",
        Timestamp: new Date(now.getTime() - 60 * 60 * 1000)
    }
]);

db.ChatMessages.insertMany([
    {
        FromUserId: 101,
        ToUserId: 1,
        RoomId: "support-101",
        Message: "Hello, can you confirm the delivery ETA for order #2201?",
        SentAt: new Date(now.getTime() - 20 * 60 * 1000),
        IsRead: false
    },
    {
        FromUserId: 1,
        ToUserId: 101,
        RoomId: "support-101",
        Message: "Sure, the delivery is scheduled for 13:45 today.",
        SentAt: new Date(now.getTime() - 18 * 60 * 1000),
        IsRead: true,
        ReadAt: new Date(now.getTime() - 17 * 60 * 1000)
    },
    {
        FromUserId: 202,
        ToUserId: 103,
        RoomId: "warehouse-202",
        Message: "Pallet A4 moved to dock 5 and ready for loading.",
        SentAt: new Date(now.getTime() - 10 * 60 * 1000),
        IsRead: true,
        ReadAt: new Date(now.getTime() - 9 * 60 * 1000)
    }
]);

db.AuditTrails.insertMany([
    {
        UserId: 135,
        Action: "Update",
        Entity: "Order",
        EntityId: 2201,
        OldValue: "Status=Processing",
        NewValue: "Status=Confirmed",
        IpAddress: "192.168.10.5",
        CreatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    },
    {
        UserId: 221,
        Action: "Create",
        Entity: "Shipment",
        EntityId: 5401,
        OldValue: null,
        NewValue: "Shipment created for order #2201",
        IpAddress: "192.168.10.23",
        CreatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    },
    {
        UserId: 307,
        Action: "Update",
        Entity: "Inventory",
        EntityId: 7802,
        OldValue: "Quantity=15",
        NewValue: "Quantity=30",
        IpAddress: "192.168.10.16",
        CreatedAt: new Date(now.getTime() - 60 * 60 * 1000)
    }
]);

db.RealTimeEvents.insertMany([
    {
        EventType: "DeliveryScheduled",
        UserId: 135,
        Data: "Order #2201 delivery scheduled for 2026-06-11 13:45",
        CreatedAt: new Date(now.getTime() - 25 * 60 * 1000)
    },
    {
        EventType: "InventoryReplenished",
        UserId: 307,
        Data: "SKU B7-200 replenished with 15 units",
        CreatedAt: new Date(now.getTime() - 40 * 60 * 1000)
    },
    {
        EventType: "UserLoggedIn",
        UserId: 1024,
        Data: "User 1024 logged in from 10.0.0.12",
        CreatedAt: new Date(now.getTime() - 62 * 60 * 1000)
    }
]);

db.TrackingLogs.insertMany([
    {
        ShipmentId: 5401,
        Status: "Picked up",
        Location: "Port of Rotterdam",
        Latitude: 51.9475,
        Longitude: 4.1427,
        Description: "Shipment collected by carrier.",
        Timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000)
    },
    {
        ShipmentId: 5401,
        Status: "In transit",
        Location: "Brussels Distribution Hub",
        Latitude: 50.8503,
        Longitude: 4.3517,
        Description: "Cargo arrived at the regional hub.",
        Timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000)
    },
    {
        ShipmentId: 5401,
        Status: "Delayed",
        Location: "Antwerp Terminal",
        Latitude: 51.2194,
        Longitude: 4.4025,
        Description: "Delayed due to customs inspection.",
        Timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000)
    },
    {
        ShipmentId: 5402,
        Status: "Delivered",
        Location: "Customer Warehouse",
        Latitude: 48.8566,
        Longitude: 2.3522,
        Description: "Delivery completed successfully.",
        Timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
]);

db.PerformanceMetrics.insertMany([
    {
        Endpoint: "/api/orders",
        Method: "GET",
        ResponseTimeMs: 124,
        StatusCode: 200,
        UserId: "135",
        Timestamp: new Date(now.getTime() - 22 * 60 * 1000)
    },
    {
        Endpoint: "/api/shipments",
        Method: "POST",
        ResponseTimeMs: 287,
        StatusCode: 201,
        UserId: "221",
        Timestamp: new Date(now.getTime() - 27 * 60 * 1000)
    },
    {
        Endpoint: "/api/products",
        Method: "GET",
        ResponseTimeMs: 98,
        StatusCode: 200,
        UserId: "307",
        Timestamp: new Date(now.getTime() - 33 * 60 * 1000)
    },
    {
        Endpoint: "/api/auth/login",
        Method: "POST",
        ResponseTimeMs: 412,
        StatusCode: 401,
        UserId: "1024",
        Timestamp: new Date(now.getTime() - 65 * 60 * 1000)
    }
]);

print("✅ MongoDB initialization completed for SupplyChainLogsDB!");
print("📁 Collections created: SystemLogs, ChatMessages, AuditTrails, RealTimeEvents, TrackingLogs, PerformanceMetrics");
print("🔍 Indexes created for all collections");
print("🌱 Seed data inserted successfully");