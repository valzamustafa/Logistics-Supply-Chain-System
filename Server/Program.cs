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

// ==========  MONGODB ==========
using (var scope = app.Services.CreateScope())
{
    try
    {
        var mongoContext = scope.ServiceProvider.GetRequiredService<MongoDbContext>();
        var database = mongoContext.GetDatabase();
        
      
var collections = new[] { "SystemLogs", "ChatMessages", "AuditTrails", "RealTimeEvents", "TrackingLogs", "PerformanceMetrics" };
        
        var existingCollections = database.ListCollectionNames().ToList();
        
        foreach (var collectionName in collections)
        {
            if (!existingCollections.Contains(collectionName))
            {
                database.CreateCollection(collectionName);
                Console.WriteLine($"✅ Created MongoDB collection: {collectionName}");
            }
        }

        if (!database.GetCollection<SystemLog>("SystemLogs").Find(FilterDefinition<SystemLog>.Empty).Any())
        {
            database.GetCollection<SystemLog>("SystemLogs").InsertOne(new SystemLog
            {
                Level = "Info",
                Service = "Server",
                Message = "MongoDB seed collection created successfully.",
                Timestamp = DateTime.UtcNow
            });
        }

        if (!database.GetCollection<ChatMessage>("ChatMessages").Find(FilterDefinition<ChatMessage>.Empty).Any())
        {
            database.GetCollection<ChatMessage>("ChatMessages").InsertOne(new ChatMessage
            {
                FromUserId = 1,
                ToUserId = 2,
                RoomId = "support-room",
                Message = "Welcome to Logjistika chat!",
                SentAt = DateTime.UtcNow,
                IsRead = false
            });
        }

        if (!database.GetCollection<AuditTrail>("AuditTrails").Find(FilterDefinition<AuditTrail>.Empty).Any())
        {
            database.GetCollection<AuditTrail>("AuditTrails").InsertOne(new AuditTrail
            {
                UserId = 1,
                Action = "SeededAudit",
                Entity = "System",
                NewValue = "Initial MongoDB audit trail created",
                CreatedAt = DateTime.UtcNow
            });
        }

        if (!database.GetCollection<RealTimeEvent>("RealTimeEvents").Find(FilterDefinition<RealTimeEvent>.Empty).Any())
        {
            database.GetCollection<RealTimeEvent>("RealTimeEvents").InsertOne(new RealTimeEvent
            {
                EventType = "SystemStarted",
                UserId = 1,
                Data = "MongoDB event seed created",
                CreatedAt = DateTime.UtcNow
            });
        }

        if (!database.GetCollection<TrackingLog>("TrackingLogs").Find(FilterDefinition<TrackingLog>.Empty).Any())
        {
            database.GetCollection<TrackingLog>("TrackingLogs").InsertOne(new TrackingLog
            {
                ShipmentId = 1,
                Status = "Created",
                Location = "Prishtina Warehouse",
                Latitude = 42.6629,
                Longitude = 21.1655,
                Description = "Initial tracking log entry",
                Timestamp = DateTime.UtcNow
            });
        }

        if (!database.GetCollection<PerformanceMetric>("PerformanceMetrics").Find(FilterDefinition<PerformanceMetric>.Empty).Any())
        {
            database.GetCollection<PerformanceMetric>("PerformanceMetrics").InsertOne(new PerformanceMetric
            {
                Endpoint = "/api/health",
                Method = "GET",
                ResponseTimeMs = 35,
                StatusCode = 200,
                UserId = "1",
                Timestamp = DateTime.UtcNow
            });
        }

        Console.WriteLine("✅ MongoDB initialized successfully!");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ MongoDB initialization warning: {ex.Message}");
        Console.WriteLine("MongoDB will work when the service is available.");
    }
}

app.Run();