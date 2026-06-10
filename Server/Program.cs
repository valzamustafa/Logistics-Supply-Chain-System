using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Models.Mongo;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<MongoDbContext>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

// ========== MONGODB - VETËM KRIJO KOLEKSIONET NËSE NUK EKZISTOJNË ==========
using (var scope = app.Services.CreateScope())
{
    try
    {
        var mongoContext = scope.ServiceProvider.GetRequiredService<MongoDbContext>();
        var database = mongoContext.GetDatabase();
        
        // Test connection
        await database.RunCommandAsync((Command<BsonDocument>)"{ping:1}");
        Console.WriteLine("✅ MongoDB connection successful!");
        
        var collections = new[] { "SystemLogs", "ChatMessages", "AuditTrails", "RealTimeEvents", "TrackingLogs", "PerformanceMetrics" };
        var existingCollections = await database.ListCollectionNames().ToListAsync();
        
        foreach (var collectionName in collections)
        {
            if (!existingCollections.Contains(collectionName))
            {
                await database.CreateCollectionAsync(collectionName);
                Console.WriteLine($"✅ Created MongoDB collection: {collectionName}");
            }
            else
            {
                Console.WriteLine($"ℹ️ Collection already exists: {collectionName}");
            }
        }

        async Task SeedIfEmpty<T>(IMongoCollection<T> collection, IEnumerable<T> documents)
        {
            if (await collection.CountDocumentsAsync(FilterDefinition<T>.Empty) == 0)
            {
                await collection.InsertManyAsync(documents);
                Console.WriteLine($"🌱 Seeded {collection.CollectionNamespace.CollectionName} with sample documents.");
            }
            else
            {
                Console.WriteLine($"ℹ️ {collection.CollectionNamespace.CollectionName} already contains data.");
            }
        }

        await SeedIfEmpty(database.GetCollection<SystemLog>("SystemLogs"), new[]
        {
            new SystemLog { Level = "Info", Service = "OrderService", Message = "Order #2201 validated successfully.", UserId = 135, IpAddress = "192.168.10.5", Endpoint = "/api/orders/validate", Timestamp = DateTime.UtcNow.AddMinutes(-18) },
            new SystemLog { Level = "Warning", Service = "ShipmentService", Message = "Shipment #5401 delayed because of weather.", UserId = 221, IpAddress = "192.168.10.23", Endpoint = "/api/shipments/status", Timestamp = DateTime.UtcNow.AddHours(-2) },
            new SystemLog { Level = "Error", Service = "AuthService", Message = "Failed login attempt for user 1024.", UserId = 1024, IpAddress = "10.0.0.12", Endpoint = "/api/auth/login", Timestamp = DateTime.UtcNow.AddHours(-1) },
            new SystemLog { Level = "Info", Service = "InventoryService", Message = "Stock level updated for SKU B7-200.", UserId = 307, IpAddress = "192.168.10.16", Endpoint = "/api/inventory/update", Timestamp = DateTime.UtcNow.AddMinutes(-45) }
        });

        await SeedIfEmpty(database.GetCollection<ChatMessage>("ChatMessages"), new[]
        {
            new ChatMessage { FromUserId = 101, ToUserId = 1, RoomId = "support-101", Message = "Hello, can you confirm the delivery ETA for order #2201?", IsRead = false, SentAt = DateTime.UtcNow.AddMinutes(-20) },
            new ChatMessage { FromUserId = 1, ToUserId = 101, RoomId = "support-101", Message = "Sure, the delivery is scheduled for 13:45 today.", IsRead = true, SentAt = DateTime.UtcNow.AddMinutes(-18), ReadAt = DateTime.UtcNow.AddMinutes(-17) },
            new ChatMessage { FromUserId = 202, ToUserId = 103, RoomId = "warehouse-202", Message = "Pallet A4 moved to dock 5 and ready for loading.", IsRead = true, SentAt = DateTime.UtcNow.AddMinutes(-10), ReadAt = DateTime.UtcNow.AddMinutes(-9) }
        });

        await SeedIfEmpty(database.GetCollection<AuditTrail>("AuditTrails"), new[]
        {
            new AuditTrail { UserId = 135, Action = "Update", Entity = "Order", EntityId = 2201, OldValue = "Status=Processing", NewValue = "Status=Confirmed", IpAddress = "192.168.10.5", CreatedAt = DateTime.UtcNow.AddHours(-3) },
            new AuditTrail { UserId = 221, Action = "Create", Entity = "Shipment", EntityId = 5401, OldValue = null, NewValue = "Shipment created for order #2201", IpAddress = "192.168.10.23", CreatedAt = DateTime.UtcNow.AddHours(-2) },
            new AuditTrail { UserId = 307, Action = "Update", Entity = "Inventory", EntityId = 7802, OldValue = "Quantity=15", NewValue = "Quantity=30", IpAddress = "192.168.10.16", CreatedAt = DateTime.UtcNow.AddHours(-1) }
        });

        await SeedIfEmpty(database.GetCollection<RealTimeEvent>("RealTimeEvents"), new[]
        {
            new RealTimeEvent { EventType = "DeliveryScheduled", UserId = 135, Data = "Order #2201 delivery scheduled for 2026-06-11 13:45", CreatedAt = DateTime.UtcNow.AddMinutes(-25) },
            new RealTimeEvent { EventType = "InventoryReplenished", UserId = 307, Data = "SKU B7-200 replenished with 15 units", CreatedAt = DateTime.UtcNow.AddMinutes(-40) },
            new RealTimeEvent { EventType = "UserLoggedIn", UserId = 1024, Data = "User 1024 logged in from 10.0.0.12", CreatedAt = DateTime.UtcNow.AddMinutes(-62) }
        });

        await SeedIfEmpty(database.GetCollection<TrackingLog>("TrackingLogs"), new[]
        {
            new TrackingLog { ShipmentId = 5401, Status = "Picked up", Location = "Port of Rotterdam", Latitude = 51.9475, Longitude = 4.1427, Description = "Shipment collected by carrier.", Timestamp = DateTime.UtcNow.AddHours(-10) },
            new TrackingLog { ShipmentId = 5401, Status = "In transit", Location = "Brussels Distribution Hub", Latitude = 50.8503, Longitude = 4.3517, Description = "Cargo arrived at the regional hub.", Timestamp = DateTime.UtcNow.AddHours(-4) },
            new TrackingLog { ShipmentId = 5401, Status = "Delayed", Location = "Antwerp Terminal", Latitude = 51.2194, Longitude = 4.4025, Description = "Delayed due to customs inspection.", Timestamp = DateTime.UtcNow.AddHours(-1) },
            new TrackingLog { ShipmentId = 5402, Status = "Delivered", Location = "Customer Warehouse", Latitude = 48.8566, Longitude = 2.3522, Description = "Delivery completed successfully.", Timestamp = DateTime.UtcNow.AddDays(-1) }
        });

        await SeedIfEmpty(database.GetCollection<PerformanceMetric>("PerformanceMetrics"), new[]
        {
            new PerformanceMetric { Endpoint = "/api/orders", Method = "GET", ResponseTimeMs = 124, StatusCode = 200, UserId = "135", Timestamp = DateTime.UtcNow.AddMinutes(-22) },
            new PerformanceMetric { Endpoint = "/api/shipments", Method = "POST", ResponseTimeMs = 287, StatusCode = 201, UserId = "221", Timestamp = DateTime.UtcNow.AddMinutes(-27) },
            new PerformanceMetric { Endpoint = "/api/products", Method = "GET", ResponseTimeMs = 98, StatusCode = 200, UserId = "307", Timestamp = DateTime.UtcNow.AddMinutes(-33) },
            new PerformanceMetric { Endpoint = "/api/auth/login", Method = "POST", ResponseTimeMs = 412, StatusCode = 401, UserId = "1024", Timestamp = DateTime.UtcNow.AddMinutes(-65) }
        });

        Console.WriteLine("✅ MongoDB is ready with sample data if needed");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ MongoDB connection warning: {ex.Message}");
        Console.WriteLine("MongoDB will work when the service is available.");
    }
}

app.Run();