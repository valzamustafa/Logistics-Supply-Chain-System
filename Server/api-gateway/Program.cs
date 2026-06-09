using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var isContainer = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true";
var servicePortMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
{
    ["auth-service"] = 5001,
    ["product-service"] = 5005,
    ["order-service"] = 5002,
    ["inventory-service"] = 5003,
    ["supplier-service"] = 5007,
    ["shipment-service"] = 5004,
    ["warehouse-service"] = 5006,
    ["notification-service"] = 5009,
    ["report-service"] = 5008,
    ["tracking-services"] = 5010,
    ["settings-service"] = 5011
};

string ResolveHost(string serviceName)
{
    var envKey = $"{serviceName.Replace('-', '_').ToUpperInvariant()}_HOST";
    var envValue = Environment.GetEnvironmentVariable(envKey);
    if (!string.IsNullOrWhiteSpace(envValue))
    {
        return envValue;
    }

    return isContainer ? serviceName : "localhost";
}

int ResolvePort(string serviceName)
{
    var envKey = $"{serviceName.Replace('-', '_').ToUpperInvariant()}_PORT";
    var envValue = Environment.GetEnvironmentVariable(envKey);
    if (int.TryParse(envValue, out var parsed))
    {
        return parsed;
    }

    return isContainer ? 80 : servicePortMap[serviceName];
}

var ocelotTemplate = File.ReadAllText("ocelot.json");
foreach (var service in servicePortMap.Keys)
{
    ocelotTemplate = ocelotTemplate.Replace($"{{{{{service.Replace('-', '_').ToUpperInvariant()}_HOST}}}}", ResolveHost(service));
    ocelotTemplate = ocelotTemplate.Replace($"{{{{{service.Replace('-', '_').ToUpperInvariant()}_PORT}}}}", ResolvePort(service).ToString());

   
    var hostEntry = $"\"DownstreamHostAndPorts\": [{{ \"Host\": \"{service}\", \"Port\": 80 }}]";
    var resolvedEntry = $"\"DownstreamHostAndPorts\": [{{ \"Host\": \"{ResolveHost(service)}\", \"Port\": {ResolvePort(service)} }}]";
    ocelotTemplate = ocelotTemplate.Replace(hostEntry, resolvedEntry);
}

builder.Configuration.AddJsonStream(new MemoryStream(Encoding.UTF8.GetBytes(ocelotTemplate)));
builder.Configuration.AddEnvironmentVariables();


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddOcelot();
builder.Services.AddSwaggerGen();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();


app.UseCors("AllowSpecificOrigin");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "API Gateway");
        c.SwaggerEndpoint("http://localhost:5001/swagger/v1/swagger.json", "Auth Service");
        c.SwaggerEndpoint("http://localhost:5002/swagger/v1/swagger.json", "Order Service");
        c.SwaggerEndpoint("http://localhost:5003/swagger/v1/swagger.json", "Inventory Service");
        c.SwaggerEndpoint("http://localhost:5004/swagger/v1/swagger.json", "Shipment Service");
        c.SwaggerEndpoint("http://localhost:5005/swagger/v1/swagger.json", "Product Service");
        c.SwaggerEndpoint("http://localhost:5006/swagger/v1/swagger.json", "Warehouse Service");
        c.SwaggerEndpoint("http://localhost:5007/swagger/v1/swagger.json", "Supplier Service");
        c.SwaggerEndpoint("http://localhost:5008/swagger/v1/swagger.json", "Report Service");
        c.SwaggerEndpoint("http://localhost:5009/swagger/v1/swagger.json", "Notification Service");
        c.SwaggerEndpoint("http://localhost:5010/swagger/v1/swagger.json", "Tracking Service");
        c.SwaggerEndpoint("http://localhost:5011/swagger/v1/swagger.json", "Settings Service");
    });
}

app.UseWebSockets();
await app.UseOcelot();

app.Run();