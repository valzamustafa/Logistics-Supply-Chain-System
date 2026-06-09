using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using System.Linq;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using NotificationService.Data;
using NotificationService.Models;
using NotificationService.Repositories.Interfaces;
using NotificationService.Repositories.Implementations;
using Microsoft.AspNetCore.SignalR;
using NotificationService.Services.Interfaces;
using NotificationService.Business;
using NotificationService.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSignalR();
builder.Services.AddHttpClient();

builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("NotificationDB")));

builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<INotificationService, NotificationService.Business.NotificationService>();
builder.Services.AddScoped<NotificationService.Services.Interfaces.IChatService, NotificationService.Services.Implementations.ChatService>();


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


var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? builder.Configuration["JwtSettings:SecretKey"];
var jwtIssuer = jwtSection["Issuer"] ?? builder.Configuration["JwtSettings:Issuer"];
var jwtAudience = jwtSection["Audience"] ?? builder.Configuration["JwtSettings:Audience"];

if (string.IsNullOrEmpty(jwtKey))
{
    jwtKey = "YourSuperSecretKeyForAuthService123!";
}

if (string.IsNullOrEmpty(jwtIssuer))
{
    jwtIssuer = "Logjistika";
}

if (string.IsNullOrEmpty(jwtAudience))
{
    jwtAudience = "LogjistikaClients";
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
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
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
                if (path.StartsWithSegments("/notificationsHub") || path.StartsWithSegments("/chatHub"))
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

app.UseRouting();
app.UseCors("AllowFrontend");
app.UseWebSockets();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/notificationsHub");
app.MapHub<NotificationService.Hubs.ChatHub>("/chatHub");

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
    await dbContext.Database.MigrateAsync();

    if (!dbContext.NotificationTemplates.Any())
    {
        dbContext.NotificationTemplates.AddRange(new[]
        {
            new NotificationTemplate
            {
                Name = "OrderConfirmed",
                Type = "Order",
                Subject = "Your order has been confirmed",
                BodyTemplate = "Hello {{CustomerName}}, your order {{OrderNumber}} has been confirmed.",
                CreatedAt = DateTime.UtcNow
            },
            new NotificationTemplate
            {
                Name = "DeliveryUpdate",
                Type = "Shipment",
                Subject = "Shipment status updated",
                BodyTemplate = "Hello {{CustomerName}}, your shipment {{TrackingNumber}} is now {{Status}}.",
                CreatedAt = DateTime.UtcNow
            }
        });
        await dbContext.SaveChangesAsync();
    }

    if (!dbContext.Notifications.Any())
    {
        dbContext.Notifications.Add(new Notification
        {
            UserId = 1,
            Type = "Info",
            Title = "Welcome to Logjistika",
            Message = "Your notification system is ready.",
            IsRead = false,
            CreatedBy = 1,
            UpdatedBy = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync();
    }

    if (!dbContext.ChatMessages.Any())
    {
        dbContext.ChatMessages.Add(new ChatMessage
        {
            SenderId = 1,
            RecipientId = 2,
            Message = "Welcome to the Logjistika chat system.",
            SentAt = DateTime.UtcNow,
            IsRead = false
        });
        await dbContext.SaveChangesAsync();
    }
}

app.Run();
