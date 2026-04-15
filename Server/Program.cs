using Microsoft.EntityFrameworkCore;
using Server.Data;
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
        
        Console.WriteLine("✅ MongoDB initialized successfully!");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ MongoDB initialization warning: {ex.Message}");
        Console.WriteLine("MongoDB will work when the service is available.");
    }
}

app.Run();
