using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Repositories.Interfaces;
using OrderService.Repositories.Implementations;
using OrderService.Services.Interfaces;
using OrderService.Business;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddDbContext<OrderDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("OrderDB")));


builder.Services.AddScoped<IOrderRepository, OrderRepository>();


builder.Services.AddScoped<IOrderService, OrderService.Business.OrderService>();

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
    var dbContext = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.Run();