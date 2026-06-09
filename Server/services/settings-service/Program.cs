using Microsoft.EntityFrameworkCore;
using SettingsService.Data;
using SettingsService.Repositories;
using SettingsService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using BuildingBlocks;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<SettingsDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddScoped<ISettingRepository, SettingRepository>();
builder.Services.AddScoped<ISettingService, SettingService>();


builder.Services.AddHttpClient<INotificationClient, NotificationClient>();


var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["Secret"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey ?? "your-default-secret-key-here"))
        };
    });


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
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();


using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<SettingsDbContext>();
    try
    {
        if (dbContext.Database.GetPendingMigrations().Any())
        {
            dbContext.Database.Migrate();
        }
        else
        {
            dbContext.Database.EnsureCreated();
        }

        if (!dbContext.Settings.Any())
        {
            dbContext.Settings.AddRange(
                new SettingsService.Models.Setting { Key = "CompanyName", Value = "Logjistika", Description = "Company name displayed throughout the application", UpdatedAt = DateTime.UtcNow },
                new SettingsService.Models.Setting { Key = "CompanyEmail", Value = "info@logjistika.com", Description = "Company email address for customer support", UpdatedAt = DateTime.UtcNow },
                new SettingsService.Models.Setting { Key = "CompanyPhone", Value = "+1-800-000-0000", Description = "Company phone number for customer inquiries", UpdatedAt = DateTime.UtcNow },
                new SettingsService.Models.Setting { Key = "CompanyAddress", Value = "123 Business St, Suite 100, City, State 12345", Description = "Company physical address", UpdatedAt = DateTime.UtcNow },
                new SettingsService.Models.Setting { Key = "SystemLanguage", Value = "en", Description = "Default system language (en, es, fr, de, etc.)", UpdatedAt = DateTime.UtcNow }
            );
            dbContext.SaveChanges();
        }
    }
    catch (Exception ex)
    {
       
        var logger = scope.ServiceProvider.GetService<ILoggerFactory>()?.CreateLogger("SettingsDbInit");
        logger?.LogWarning(ex, "EF initialization failed; attempting raw SQL schema creation.");

        try
        {
            var createTableSql = @"
IF OBJECT_ID('dbo.Settings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Settings (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        [Key] NVARCHAR(100) NOT NULL,
        [Value] NVARCHAR(500) NOT NULL,
        Description NVARCHAR(500) NULL,
        UpdatedAt DATETIME2 NULL
    );
END
";

            dbContext.Database.ExecuteSqlRaw(createTableSql);

            var insertSql = @"
IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE [Key] = 'CompanyName')
    INSERT INTO dbo.Settings ([Key],[Value],Description,UpdatedAt) VALUES ('CompanyName','Logjistika','Company name displayed throughout the application',GETUTCDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE [Key] = 'CompanyEmail')
    INSERT INTO dbo.Settings ([Key],[Value],Description,UpdatedAt) VALUES ('CompanyEmail','info@logjistika.com','Company email address for customer support',GETUTCDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE [Key] = 'CompanyPhone')
    INSERT INTO dbo.Settings ([Key],[Value],Description,UpdatedAt) VALUES ('CompanyPhone','+1-800-000-0000','Company phone number for customer inquiries',GETUTCDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE [Key] = 'CompanyAddress')
    INSERT INTO dbo.Settings ([Key],[Value],Description,UpdatedAt) VALUES ('CompanyAddress','123 Business St, Suite 100, City, State 12345','Company physical address',GETUTCDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Settings WHERE [Key] = 'SystemLanguage')
    INSERT INTO dbo.Settings ([Key],[Value],Description,UpdatedAt) VALUES ('SystemLanguage','en','Default system language (en, es, fr, de, etc.)',GETUTCDATE());
";

            dbContext.Database.ExecuteSqlRaw(insertSql);
            logger?.LogInformation("Raw SQL schema creation and seeding completed.");
        }
        catch (Exception inner)
        {
            logger?.LogError(inner, "Raw SQL fallback failed to create schema or seed data.");
        }
    }
}

app.Run();
