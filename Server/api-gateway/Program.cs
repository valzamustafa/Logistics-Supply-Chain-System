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
    ["tracking-services"] = 5010
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
    app.UseSwaggerUI();
}

app.UseWebSockets();
await app.UseOcelot();

app.Run();