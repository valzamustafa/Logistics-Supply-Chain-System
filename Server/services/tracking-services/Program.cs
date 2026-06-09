using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using Microsoft.IdentityModel.Tokens;
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
