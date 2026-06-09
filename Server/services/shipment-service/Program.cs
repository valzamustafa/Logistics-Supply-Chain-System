using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ShipmentService.Data;
using ShipmentService.Models;
using ShipmentService.Repositories;
using ShipmentService.Repositories.Interfaces;
using ShipmentService.Services;
using ShipmentService.Services.Interfaces;
using ShipmentService.Filters;
using ShipmentService.Hubs;
using BuildingBlocks;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers(options => options.Filters.Add<NotificationActionFilter>())
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    connectionString = "Server=mssql;Database=ShipmentServiceDB;User Id=sa;Password=YourStrong!Password123;TrustServerCertificate=true;Encrypt=false";
}
builder.Services.AddDbContext<ShipmentDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions => sqlOptions.EnableRetryOnFailure()));


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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role
        };

      
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"].FirstOrDefault();
                var authHeader = context.Request.Headers["Authorization"].ToString();
                var path = context.HttpContext.Request.Path;

              
                if (path.StartsWithSegments("/dashboardHub"))
                {
                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        context.Token = accessToken;
                    }
                    else if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        context.Token = authHeader.Substring("Bearer ".Length).Trim();
                    }
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    var allowedShipmentRoles = new[] { "Admin", "Manager", "Supplier", "Warehouse", "WarehouseStaff" };

    options.AddPolicy("ShipmentCreator", policy =>
        policy.RequireAuthenticatedUser()
              .RequireAssertion(context =>
                  context.User.Claims.Any(c =>
                      (c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "roles" || c.Type == ClaimTypes.Role)
                      && allowedShipmentRoles.Any(role => string.Equals(c.Value, role, StringComparison.OrdinalIgnoreCase))
                  )
              )
    );


    var permissionNames = new[] { "view_users","create_users","edit_users","delete_users","view_warehouses","manage_warehouses","view_inventory","manage_inventory","view_orders","manage_orders","view_shipments","manage_shipments" };
    foreach (var p in permissionNames)
    {
        options.AddPolicy(p, policy => policy.RequireClaim("permission", p));
    }

    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});


builder.Services.AddScoped<IShipmentRepository, ShipmentRepository>();
builder.Services.AddScoped<IShipmentService, ShipmentServices>();
builder.Services.AddScoped<IDriverRepository, DriverRepository>();
builder.Services.AddScoped<IVehicleRepository, VehicleRepository>();


builder.Services.AddHttpClient<BuildingBlocks.INotificationClient, BuildingBlocks.NotificationClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});


builder.Services.AddHttpClient();
builder.Services.AddScoped<NotificationActionFilter>();

var app = builder.Build();


app.UseExceptionHandler(appBuilder =>
{
    appBuilder.Run(async context =>
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        var ex = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        
        if (ex?.Error != null)
        {
            logger.LogError(ex.Error, "Unhandled exception in {Path}", context.Request.Path);
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        
        await context.Response.WriteAsJsonAsync(new 
        { 
            message = "Internal server error", 
            error = ex?.Error?.Message ?? "Unknown error",
            detail = app.Environment.IsDevelopment() ? ex?.Error?.StackTrace : null
        });
    });
});


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseWebSockets();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<DashboardHub>("/dashboardHub");


using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ShipmentDbContext>();
    try
    {
        await EnsureDatabaseExistsAsync(connectionString);

        if (app.Environment.IsDevelopment())
        {
            var hasShipmentTables = await dbContext.Database
                .SqlQueryRaw<int>("SELECT CASE WHEN OBJECT_ID(N'[Shipments]', N'U') IS NULL THEN 0 ELSE 1 END AS [Value]")
                .SingleAsync();

            var needsRecreate = hasShipmentTables == 0;

            if (!needsRecreate)
            {
                try
                {
                    var hasPurchaseOrderId = await dbContext.Database
                        .SqlQueryRaw<int>("SELECT CASE WHEN EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Shipments' AND COLUMN_NAME = 'PurchaseOrderId') THEN 1 ELSE 0 END AS [Value]")
                        .SingleAsync();

                    if (hasPurchaseOrderId == 0)
                    {
                        needsRecreate = true;
                    }

                    var hasVehicleDriverId = await dbContext.Database
                        .SqlQueryRaw<int>("SELECT CASE WHEN EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Vehicles' AND COLUMN_NAME = 'DriverId') THEN 1 ELSE 0 END AS [Value]")
                        .SingleAsync();

                    var hasVehicleImageUrl = await dbContext.Database
                        .SqlQueryRaw<int>("SELECT CASE WHEN EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Vehicles' AND COLUMN_NAME = 'ImageUrl') THEN 1 ELSE 0 END AS [Value]")
                        .SingleAsync();

                    if (hasVehicleDriverId == 0 || hasVehicleImageUrl == 0)
                    {
                        needsRecreate = true;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Schema validation failed: {ex.Message}");
                    needsRecreate = true;
                }
            }

            if (needsRecreate)
            {
                Console.WriteLine("Recreating ShipmentServiceDB because schema is out of date or missing required columns.");
                await dbContext.Database.EnsureDeletedAsync();
            }
        }

        await dbContext.Database.EnsureCreatedAsync();
        Console.WriteLine("Database schema ensured successfully!");

        var now = DateTime.UtcNow;
        const int adminUserId = 1;

        if (!dbContext.Drivers.Any())
        {
            dbContext.Drivers.Add(new Driver
            {
                UserId = 3,
                LicenseNumber = "D-PR-2025-001",
                PhoneNumber = "+383443210987",
                IsAvailable = true,
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            });
            await dbContext.SaveChangesAsync();
        }

        if (!dbContext.Vehicles.Any())
        {
            var driver = dbContext.Drivers.First();
            dbContext.Vehicles.Add(new Vehicle
            {
                PlateNumber = "04-123-AB",
                Model = "Volvo FH",
                Capacity = 18000,
                IsAvailable = true,
                DriverId = driver.Id,
                VehicleType = "Truck",
                Year = 2022,
                Color = "White",
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            });
            await dbContext.SaveChangesAsync();
        }

        if (!dbContext.Shipments.Any())
        {
            var driver = dbContext.Drivers.First();
            var vehicle = dbContext.Vehicles.First();

            var shipment = new Shipment
            {
                TrackingNumber = "TRK-2025-0001",
                OrderId = 1,
                DriverId = driver.Id,
                VehicleId = vehicle.Id,
                Status = "In Transit",
                Priority = 2,
                CurrentLocation = "Prishtina Warehouse",
                LastLocationUpdate = now,
                EstimatedDeliveryDate = now.AddDays(2),
                ShippingAddress = "Rruga B 34, Mitrovicë",
                PickupLocation = "Central Warehouse, Prishtinë",
                DeliveryLocation = "Mitrovicë Distribution Center",
                Distance = 132.5M,
                ETA = "48 hours",
                InventoryDeducted = true,
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now,
                Items = new List<ShipmentItem>
                {
                    new ShipmentItem
                    {
                        ProductId = 1,
                        Quantity = 25,
                        ProductName = "Smart Supply Tracker",
                        UnitPrice = 49.99M
                    }
                }
            };

            dbContext.Shipments.Add(shipment);
            await dbContext.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database initialization error: {ex.Message}");
    }
}

app.Run();

static async Task EnsureDatabaseExistsAsync(string connectionString)
{
    var builder = new SqlConnectionStringBuilder(connectionString);
    var databaseName = builder.InitialCatalog;
    if (string.IsNullOrEmpty(databaseName))
    {
        return;
    }

    var masterBuilder = new SqlConnectionStringBuilder(connectionString)
    {
        InitialCatalog = "master"
    };

    await using var connection = new SqlConnection(masterBuilder.ConnectionString);
    await connection.OpenAsync();

    await using var command = connection.CreateCommand();
    command.CommandText = $"IF DB_ID(N'{databaseName}') IS NULL CREATE DATABASE [{databaseName}]";
    await command.ExecuteNonQueryAsync();
}
