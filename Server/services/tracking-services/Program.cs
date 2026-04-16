using Microsoft.EntityFrameworkCore;
using TrackingService.Data;
using TrackingService.Repositories.Interfaces;
using TrackingService.Repositories.Implementations;
using TrackingService.Services.Interfaces;
using TrackingService.Business;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<TrackingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("TrackingDB")));

builder.Services.AddScoped<ITrackingRepository, TrackingRepository>();
builder.Services.AddScoped<ITrackingService, TrackingService.Business.TrackingService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<TrackingDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.Run();