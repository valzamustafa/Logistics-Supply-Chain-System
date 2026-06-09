using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using ReportService.Data;
using ReportService.Filters;
using ReportService.Models;
using ReportService.Repositories.Interfaces;
using ReportService.Repositories.Implementations;
using ReportService.Services.Interfaces;
using ReportService.Business;
using ReportService.Hubs;
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
builder.Services.AddSignalR();


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

builder.Services.AddDbContext<ReportDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("ReportDB")));

builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<IReportService, ReportService.Business.ReportService>();


builder.Services.AddHttpClient<INotificationClient, NotificationClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});


var jwtKey = builder.Configuration["Jwt:Key"] ?? builder.Configuration["JwtSettings:SecretKey"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? builder.Configuration["JwtSettings:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? builder.Configuration["JwtSettings:Audience"];

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
            ValidIssuers = new[]
            {
                jwtIssuer ?? "AuthService",
                "Logjistika"
            },
            ValidAudiences = new[]
            {
                jwtAudience ?? "LogisticsSystem",
                "LogjistikaClients"
            },
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role
        };
        
    
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/dashboardHub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogWarning("JWT authentication failed: {Message}", context.Exception?.Message);
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogWarning("JWT challenge: {Error} {ErrorDescription}", context.Error, context.ErrorDescription);
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

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<DashboardHub>("/dashboardHub");

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ReportDbContext>();
    await dbContext.Database.MigrateAsync();

    var now = DateTime.UtcNow;
    const int adminUserId = 1;

    if (!dbContext.Reports.Any())
    {
        var report = new Report
        {
            Type = "Inventory",
            Name = "Monthly Warehouse Inventory Report",
            Data = "{\"items\":[{\"name\":\"Smart Supply Tracker\",\"qty\":120}]}",
            GeneratedAt = now,
            GeneratedBy = adminUserId,
            CreatedBy = adminUserId,
            UpdatedBy = adminUserId,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Reports.Add(report);
        await dbContext.SaveChangesAsync();

        dbContext.ReportLogs.Add(new ReportLog
        {
            ReportId = report.Id,
            Status = "Created",
            ErrorMessage = null,
            ExecutedAt = now,
            CreatedBy = adminUserId,
            UpdatedBy = adminUserId,
            CreatedAt = now,
            UpdatedAt = now
        });

        await dbContext.SaveChangesAsync();
    }
}

app.Run();
