using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using OrderService.Data;
using OrderService.Models;
using OrderService.Repositories.Interfaces;
using OrderService.Repositories.Implementations;
using OrderService.Services.Interfaces;
using OrderService.Business;
using OrderService.Filters;
using OrderService.Hubs;
using BuildingBlocks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options => options.Filters.Add<NotificationActionFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", 
                "http://localhost:5174", 
                "http://localhost:3000", 
                "http://localhost:5000",
                "http://localhost:5175",
                "http://localhost:5176"
              )
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});


builder.Services.AddDbContext<OrderDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("OrderDB")));


builder.Services.AddScoped<IOrderRepository, OrderRepository>();


builder.Services.AddScoped<IOrderService, OrderService.Business.OrderService>();


builder.Services.AddHttpClient();
builder.Services.AddScoped<NotificationActionFilter>();


builder.Services.AddHttpClient<INotificationClient, NotificationClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});


builder.Services.AddSignalR();


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
        
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub"))
                {
                    context.Token = accessToken;
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

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<DashboardHub>("/dashboardHub");

try
{
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
        await dbContext.Database.EnsureCreatedAsync();

        var now = DateTime.UtcNow;
        const int adminUserId = 1;

        if (!dbContext.Orders.Any())
        {
            var order = new Order
            {
                OrderNumber = "ORD-1001",
                UserId = 1,
                OrderDate = now.AddDays(-1),
                TotalAmount = 149.97M,
                ShippingCost = 9.99M,
                TaxAmount = 0M,
                Status = "Confirmed",
                ShippingAddress = "Rruga e Dëshmorëve 10, Prishtinë",
                BillingName = "Logjistika Operations",
                BillingEmail = "billing@logjistika.com",
                BillingPhone = "+383441234567",
                BillingAddress = "Rruga e Dëshmorëve 10, Prishtinë",
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now,
                OrderItems = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = 1,
                        Quantity = 3,
                        UnitPrice = 49.99M,
                        DiscountPercent = 0,
                        CreatedBy = adminUserId,
                        UpdatedBy = adminUserId,
                        CreatedAt = now,
                        UpdatedAt = now
                    }
                },
                Payments = new List<Payment>
                {
                    new Payment
                    {
                        PaymentMethod = "Credit Card",
                        Amount = 149.97M,
                        Status = "Completed",
                        TransactionId = "TXN-1001",
                        CompletedAt = now,
                        CreatedBy = adminUserId,
                        UpdatedBy = adminUserId,
                        CreatedAt = now,
                        UpdatedAt = now,
                        Transactions = new List<PaymentTransaction>
                        {
                            new PaymentTransaction
                            {
                                TransactionReference = "TXN-1001",
                                Amount = 149.97M,
                                Status = "Success",
                                ResponseData = "Payment captured successfully",
                                CreatedBy = adminUserId,
                                UpdatedBy = adminUserId,
                                CreatedAt = now,
                                UpdatedAt = now
                            }
                        }
                    }
                }
            };

            dbContext.Orders.Add(order);
            await dbContext.SaveChangesAsync();
        }

        if (!dbContext.Carts.Any())
        {
            var cart = new Cart
            {
                UserId = 1,
                CreatedBy = adminUserId,
                UpdatedBy = adminUserId,
                CreatedAt = now,
                UpdatedAt = now,
                CartItems = new List<CartItem>
                {
                    new CartItem
                    {
                        ProductId = 2,
                        Quantity = 2,
                        CreatedBy = adminUserId,
                        UpdatedBy = adminUserId,
                        CreatedAt = now,
                        UpdatedAt = now
                    }
                }
            };

            dbContext.Carts.Add(cart);
            await dbContext.SaveChangesAsync();
        }
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Database initialization warning (non-fatal): {ex.Message}");
}

app.Run();