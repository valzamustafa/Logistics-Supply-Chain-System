using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using ProductService.Data;
using ProductService.Models;
using ProductService.Repositories.Interfaces;
using ProductService.Repositories.Implementations;
using ProductService.Services.Interfaces;
using ProductService.Services.Implementations;
using ProductService.Filters;
using BuildingBlocks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options => options.Filters.Add<NotificationActionFilter>())
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ProductDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("ProductDB")));

builder.Services.AddHttpClient();
builder.Services.AddScoped<NotificationActionFilter>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IProductService, ProductService.Services.Implementations.ProductService>();


builder.Services.AddHttpClient<BuildingBlocks.INotificationClient, BuildingBlocks.NotificationClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
    {
        builder.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://localhost:5000")
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

var webRootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(webRootPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRootPath),
    RequestPath = string.Empty
});

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ProductDbContext>();
    await dbContext.Database.EnsureCreatedAsync();

    var now = DateTime.UtcNow;
    const int adminUserId = 1;

    if (!dbContext.Categories.Any())
    {
        dbContext.Categories.Add(new Category
        {
            Name = "General",
            Description = "Default category for products",
            CreatedBy = adminUserId,
            UpdatedBy = adminUserId,
            CreatedAt = now,
            UpdatedAt = now
        });
        await dbContext.SaveChangesAsync();
    }

    if (!dbContext.Products.Any())
    {
        var category = dbContext.Categories.First();

        var products = new[]
        {
            new Product
            {
                Name = "Smart Supply Tracker",
                SKU = "LOG-PRD-001",
                Description = "Intelligent inventory tracker for warehouses and shipments.",
                Price = 299.99M,
                Cost = 180.00M,
                CategoryId = category.Id,
                IsActive = true,
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            },
            new Product
            {
                Name = "Warehouse Barcode Scanner",
                SKU = "LOG-PRD-002",
                Description = "Handheld scanner for fast receiving and picking operations.",
                Price = 129.99M,
                Cost = 75.00M,
                CategoryId = category.Id,
                IsActive = true,
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        dbContext.Products.AddRange(products);
        await dbContext.SaveChangesAsync();
    }

    if (!dbContext.ProductImages.Any())
    {
        var products = dbContext.Products.Take(2).ToList();
        if (products.Any())
        {
            dbContext.ProductImages.AddRange(new[]
            {
                new ProductImage
                {
                    ProductId = products[0].Id,
                    ImageUrl = "https://example.com/images/smart-supply-tracker.png",
                    IsPrimary = true,
                    DisplayOrder = 1,
                    CreatedBy = adminUserId,
                    UpdatedBy = adminUserId,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new ProductImage
                {
                    ProductId = products[1].Id,
                    ImageUrl = "https://example.com/images/barcode-scanner.png",
                    IsPrimary = true,
                    DisplayOrder = 1,
                    CreatedBy = adminUserId,
                    UpdatedBy = adminUserId,
                    CreatedAt = now,
                    UpdatedAt = now
                }
            });
            await dbContext.SaveChangesAsync();
        }
    }

    if (!dbContext.ProductReviews.Any())
    {
        var product = dbContext.Products.First();
        dbContext.ProductReviews.AddRange(new[]
        {
            new ProductReview
            {
                ProductId = product.Id,
                UserId = 1,
                Rating = 5,
                Comment = "Excellent product for logistics teams.",
                IsApproved = true,
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now
            }
        });
        await dbContext.SaveChangesAsync();
    }
}

app.Run();