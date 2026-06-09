using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using WarehouseService.Data;
using WarehouseService.Models;
using WarehouseService.Repositories.Interfaces;
using WarehouseService.Repositories.Implementations;
using WarehouseService.Services.Interfaces;
using WarehouseService.Services;
using WarehouseService.Business;
using WarehouseService.Filters;
using BuildingBlocks;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddScoped<IWarehouseNotificationService, WarehouseNotificationService>();

builder.Services.AddHttpClient<INotificationClient, NotificationClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddControllers(options => options.Filters.Add<NotificationActionFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Warehouse Service API", Version = "v1" });
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});


builder.Services.AddDbContext<WarehouseDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("WarehouseDB")));


builder.Services.AddScoped<IWarehouseRepository, WarehouseRepository>();


builder.Services.AddScoped<IWarehouseService, WarehouseService.Business.WarehouseService>();


builder.Services.AddHttpClient<INotificationClient, NotificationClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});


builder.Services.AddHttpClient();
builder.Services.AddScoped<NotificationActionFilter>();


builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.AddDebug();
});


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", 
                "http://localhost:5174", 
                "http://localhost:3000", 
                "http://localhost:5000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});


var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? builder.Configuration["JwtSettings:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? builder.Configuration["JwtSettings:Audience"];
var jwtKey = builder.Configuration["Jwt:Key"] ?? builder.Configuration["JwtSettings:SecretKey"];

if (string.IsNullOrEmpty(jwtKey))
{
    jwtKey = "YourSuperSecretKeyForJWTThatIsAtLeast32CharactersLong123!";
    jwtIssuer = "Logjistika";
    jwtAudience = "LogjistikaClients";
}

Console.WriteLine($"JWT Issuer: {jwtIssuer}");
Console.WriteLine($"JWT Audience: {jwtAudience}");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
        
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"Authentication failed: {context.Exception.Message}");
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                Console.WriteLine("Token validated successfully");
                return Task.CompletedTask;
            },
            OnMessageReceived = context =>
            {
                var token = context.Request.Headers["Authorization"].ToString();
                Console.WriteLine($"Token received: {(string.IsNullOrEmpty(token) ? "No" : "Yes")}");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
    
    var permissionNames = new[]
    {
        "view_users","create_users","edit_users","delete_users",
        "view_warehouses","manage_warehouses","view_inventory","manage_inventory",
        "view_orders","manage_orders","view_shipments","manage_shipments"
    };

    foreach (var p in permissionNames)
    {
        options.AddPolicy(p, policy => policy.RequireClaim("permission", p));
    }
});

var app = builder.Build();


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Warehouse Service API v1");
    });
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();


using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<WarehouseDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        logger.LogInformation("Applying pending database migrations for WarehouseService...");
        await dbContext.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully");

        var now = DateTime.UtcNow;
        const int adminUserId = 1;

        if (!dbContext.Warehouses.Any())
        {
            var warehouse = new Warehouse
            {
                Name = "Central Warehouse",
                Location = "Bulevardi Nënë Tereza 12, Prishtinë",
                Phone = "+383441234567",
                IsActive = true,
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            };

            warehouse.Zones.Add(new WarehouseZone
            {
                ZoneName = "Receiving A",
                Description = "Primary receiving and staging zone",
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            });

            warehouse.Staff.Add(new WarehouseStaff
            {
                UserId = 2,
                Position = "Warehouse Supervisor",
                HireDate = now.AddMonths(-6),
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            });

            dbContext.Warehouses.Add(warehouse);
            await dbContext.SaveChangesAsync();

            var stock = new WarehouseStock
            {
                WarehouseId = warehouse.Id,
                ProductId = 1,
                Quantity = 120,
                MinimumStockLevel = 10,
                MaximumStockLevel = 500,
                ShelfLocation = "A1-01",
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            };

            dbContext.WarehouseStocks.Add(stock);
            await dbContext.SaveChangesAsync();

            dbContext.StockMovements.Add(new StockMovement
            {
                WarehouseStockId = stock.Id,
                ProductId = stock.ProductId,
                Type = MovementType.Inbound,
                Quantity = 120,
                PreviousQuantity = 0,
                NewQuantity = 120,
                Reference = "Initial inventory seed",
                Notes = "Initial warehouse stock seeded",
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            });

            await dbContext.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database schema creation failed");
    }
}

app.Run();
