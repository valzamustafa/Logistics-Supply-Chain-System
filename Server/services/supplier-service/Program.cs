using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;
using SupplierService.Data;
using SupplierService.Models;
using SupplierService.Repositories.Interfaces;
using SupplierService.Repositories.Implementations;
using SupplierService.Services.Interfaces;
using SupplierService.Services.Implementations;
using SupplierService.Filters;
using BuildingBlocks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options => options.Filters.Add<NotificationActionFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<SupplierDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SupplierDB"))
           .ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddHttpClient();
builder.Services.AddScoped<NotificationActionFilter>();
builder.Services.AddScoped<ISupplierRepository, SupplierRepository>();
builder.Services.AddScoped<ISupplierService, SupplierService.Services.Implementations.SupplierService>();


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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role
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

QuestPDF.Settings.License = LicenseType.Community;

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
    var dbContext = scope.ServiceProvider.GetRequiredService<SupplierDbContext>();
    try
    {
        await dbContext.Database.MigrateAsync();

        var now = DateTime.UtcNow;
        const int adminUserId = 1;

        if (!dbContext.Suppliers.Any())
        {
            var supplier = new Supplier
            {
                Name = "Balkan Supply Partners",
                ContactPerson = "Mira Krasniqi",
                Email = "sales@balkansupply.com",
                Phone = "+383441987654",
                VatNumber = "AL123456789",
                Address = "Rruga B 25, Prishtinë",
                PaymentTerms = "30 days",
                CreditLimit = 25000M,
                IsApproved = true,
                IsActive = true,
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            };

            dbContext.Suppliers.Add(supplier);
            await dbContext.SaveChangesAsync();

            dbContext.SupplierProducts.Add(new SupplierProduct
            {
                SupplierId = supplier.Id,
                ProductId = 1,
                SupplierSKU = "SUP-001",
                LeadTimeDays = 5,
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            });

            dbContext.PurchaseOrders.Add(new PurchaseOrder
            {
                SupplierId = supplier.Id,
                WarehouseId = 1,
                PONumber = "PO-5001",
                InvoiceNumber = "INV-5001",
                OrderDate = now.AddDays(-7),
                ExpectedDeliveryDate = now.AddDays(3),
                Status = "Ordered",
                TotalAmount = 1250.00M,
                Notes = "Seeded supplier purchase order for warehouse stock.",
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now,
                Items = new List<PurchaseOrderItem>
                {
                    new PurchaseOrderItem
                    {
                        ProductId = 1,
                        Quantity = 25,
                        UnitPrice = 50.00M,
                        TotalPrice = 1250.00M,
                        CreatedBy = adminUserId,
                        UpdatedBy = adminUserId,
                        CreatedAt = now,
                        UpdatedAt = now
                    }
                }
            });

            await dbContext.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Supplier DB migration failed; continuing startup with current schema.");
    }
}

app.Run();