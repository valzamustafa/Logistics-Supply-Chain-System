using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson;
using MongoDB.Driver;
using TrackingService.Data;
using TrackingService.Filters;
using TrackingService.Models;
using TrackingService.Repositories.Interfaces;
using TrackingService.Repositories.Implementations;
using TrackingService.Services.Interfaces;
using TrackingService.Business;
using BuildingBlocks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options => options.Filters.Add<NotificationActionFilter>());
builder.Services.AddHttpClient();

builder.Services.AddHttpClient<INotificationClient, NotificationClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<TrackingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("TrackingDB")));

builder.Services.AddScoped<ITrackingRepository, TrackingRepository>();
builder.Services.AddScoped<ITrackingService, TrackingService.Business.TrackingService>();
builder.Services.AddSingleton<MongoDbContext>();


builder.Services.AddHttpClient<INotificationClient, NotificationClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://localhost:5000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});


var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrEmpty(jwtKey))
{
    jwtKey = "YourSuperSecretKeyForJWTThatIsAtLeast32CharactersLong123!";
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer ?? "Logjistika",
            ValidAudience = jwtAudience ?? "LogjistikaClients",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
    var permissionNames = new[] { "view_users","create_users","edit_users","delete_users","view_warehouses","manage_warehouses","view_inventory","manage_inventory","view_orders","manage_orders","view_shipments","manage_shipments" };
    foreach (var p in permissionNames)
    {
        options.AddPolicy(p, policy => policy.RequireClaim("permission", p));
    }
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<TrackingDbContext>();
    await dbContext.Database.MigrateAsync();

    var mongoContext = scope.ServiceProvider.GetRequiredService<MongoDbContext>();
    var mongoDb = mongoContext.GetDatabase();

    async Task SeedIfEmpty(string collectionName, IEnumerable<BsonDocument> documents)
    {
        var collection = mongoDb.GetCollection<BsonDocument>(collectionName);
        if (await collection.CountDocumentsAsync(FilterDefinition<BsonDocument>.Empty) == 0)
        {
            await collection.InsertManyAsync(documents);
            Console.WriteLine($"🌱 Seeded {collectionName} with sample documents.");
        }
        else
        {
            Console.WriteLine($"ℹ️ {collectionName} already contains data.");
        }
    }

    await SeedIfEmpty("SystemLogs", new[]
    {
        new BsonDocument
        {
            { "Level", "Info" },
            { "Service", "OrderService" },
            { "Message", "Order #2201 validated successfully." },
            { "UserId", 135 },
            { "IpAddress", "192.168.10.5" },
            { "Endpoint", "/api/orders/validate" },
            { "Timestamp", DateTime.UtcNow.AddMinutes(-18) }
        },
        new BsonDocument
        {
            { "Level", "Warning" },
            { "Service", "ShipmentService" },
            { "Message", "Shipment #5401 delayed because of weather." },
            { "UserId", 221 },
            { "IpAddress", "192.168.10.23" },
            { "Endpoint", "/api/shipments/status" },
            { "Timestamp", DateTime.UtcNow.AddHours(-2) }
        },
        new BsonDocument
        {
            { "Level", "Error" },
            { "Service", "AuthService" },
            { "Message", "Failed login attempt for user 1024." },
            { "UserId", 1024 },
            { "IpAddress", "10.0.0.12" },
            { "Endpoint", "/api/auth/login" },
            { "Timestamp", DateTime.UtcNow.AddHours(-1) }
        }
    });

    await SeedIfEmpty("ChatMessages", new[]
    {
        new BsonDocument
        {
            { "FromUserId", 101 },
            { "ToUserId", 1 },
            { "RoomId", "support-101" },
            { "Message", "Hello, can you confirm the delivery ETA for order #2201?" },
            { "SentAt", DateTime.UtcNow.AddMinutes(-20) },
            { "IsRead", false }
        },
        new BsonDocument
        {
            { "FromUserId", 1 },
            { "ToUserId", 101 },
            { "RoomId", "support-101" },
            { "Message", "Sure, the delivery is scheduled for 13:45 today." },
            { "SentAt", DateTime.UtcNow.AddMinutes(-18) },
            { "IsRead", true },
            { "ReadAt", DateTime.UtcNow.AddMinutes(-17) }
        }
    });

    await SeedIfEmpty("AuditTrails", new[]
    {
        new BsonDocument
        {
            { "UserId", 135 },
            { "Action", "Update" },
            { "Entity", "Order" },
            { "EntityId", 2201 },
            { "OldValue", "Status=Processing" },
            { "NewValue", "Status=Confirmed" },
            { "IpAddress", "192.168.10.5" },
            { "CreatedAt", DateTime.UtcNow.AddHours(-3) }
        },
        new BsonDocument
        {
            { "UserId", 221 },
            { "Action", "Create" },
            { "Entity", "Shipment" },
            { "EntityId", 5401 },
            { "OldValue", BsonNull.Value },
            { "NewValue", "Shipment created for order #2201" },
            { "IpAddress", "192.168.10.23" },
            { "CreatedAt", DateTime.UtcNow.AddHours(-2) }
        }
    });

    await SeedIfEmpty("RealTimeEvents", new[]
    {
        new BsonDocument
        {
            { "EventType", "DeliveryScheduled" },
            { "UserId", 135 },
            { "Data", "Order #2201 delivery scheduled for 2026-06-11 13:45" },
            { "CreatedAt", DateTime.UtcNow.AddMinutes(-25) }
        },
        new BsonDocument
        {
            { "EventType", "InventoryReplenished" },
            { "UserId", 307 },
            { "Data", "SKU B7-200 replenished with 15 units" },
            { "CreatedAt", DateTime.UtcNow.AddMinutes(-40) }
        }
    });

    await SeedIfEmpty("TrackingLogs", new[]
    {
        new BsonDocument
        {
            { "ShipmentId", 5401 },
            { "Status", "Picked up" },
            { "Location", "Port of Rotterdam" },
            { "Latitude", 51.9475 },
            { "Longitude", 4.1427 },
            { "Description", "Shipment collected by carrier." },
            { "Timestamp", DateTime.UtcNow.AddHours(-10) }
        },
        new BsonDocument
        {
            { "ShipmentId", 5401 },
            { "Status", "In transit" },
            { "Location", "Brussels Distribution Hub" },
            { "Latitude", 50.8503 },
            { "Longitude", 4.3517 },
            { "Description", "Cargo arrived at the regional hub." },
            { "Timestamp", DateTime.UtcNow.AddHours(-4) }
        }
    });

    await SeedIfEmpty("PerformanceMetrics", new[]
    {
        new BsonDocument
        {
            { "Endpoint", "/api/orders" },
            { "Method", "GET" },
            { "ResponseTimeMs", 124 },
            { "StatusCode", 200 },
            { "UserId", "135" },
            { "Timestamp", DateTime.UtcNow.AddMinutes(-22) }
        },
        new BsonDocument
        {
            { "Endpoint", "/api/shipments" },
            { "Method", "POST" },
            { "ResponseTimeMs", 287 },
            { "StatusCode", 201 },
            { "UserId", "221" },
            { "Timestamp", DateTime.UtcNow.AddMinutes(-27) }
        }
    });

    var now = DateTime.UtcNow;
    const int adminUserId = 1;

    if (!dbContext.Trackings.Any())
    {
        dbContext.Trackings.Add(new Tracking
        {
            ShipmentId = 1,
            CurrentStatus = "In Transit",
            CurrentLocation = "Prishtina Distribution Hub",
            LastUpdateTime = now,
            EstimatedDeliveryDate = now.AddDays(2),
            CreatedBy = adminUserId,
            UpdatedBy = adminUserId,
            CreatedAt = now,
            UpdatedAt = now
        });
        await dbContext.SaveChangesAsync();
    }
}

app.Run();
