
using System;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace OrderService.Filters
{
    public class NotificationActionFilter : IAsyncActionFilter
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        private static readonly string[] NotificationMethods = { HttpMethods.Post, HttpMethods.Put, HttpMethods.Delete, HttpMethods.Patch };

        public NotificationActionFilter(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var executedContext = await next();
            var request = context.HttpContext.Request;

            if (!NotificationMethods.Contains(request.Method, StringComparer.OrdinalIgnoreCase))
            {
                return;
            }

            if (!(context.HttpContext.User.Identity?.IsAuthenticated ?? false))
            {
                return;
            }

            if (request.Path.HasValue && request.Path.Value.Contains("/api/notifications", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            if (executedContext.Exception != null || context.HttpContext.Response.StatusCode >= 400)
            {
                return;
            }

            var userId = GetUserId(context.HttpContext.User);
            if (userId == null)
            {
                return;
            }

            var (title, message) = BuildNotification(request.Method, request.Path.Value ?? string.Empty);
            if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(message))
            {
                return;
            }

            var notificationUrl = _configuration["Services:NotificationService"]
                ?? _configuration["NotificationServiceUrl"]
                ?? "http://notification-service";
            notificationUrl = notificationUrl.TrimEnd('/');

            try
            {
                var client = _httpClientFactory.CreateClient();
                AddInternalAuthHeader(client);

                await client.PostAsJsonAsync(
                    new Uri($"{notificationUrl}/api/notifications/send"),
                    new
                    {
                        UserId = userId.Value,
                        Type = "SystemAction",
                        Title = title,
                        Message = message
                    });

                var targetRoles = GetNotificationTargetRoles(request.Path.Value ?? string.Empty, request.Method);
                foreach (var role in targetRoles)
                {
                    await client.PostAsJsonAsync(
                        new Uri($"{notificationUrl}/api/notifications/send-to-role"),
                        new
                        {
                            Role = role,
                            Type = "SystemAction",
                            Title = title,
                            Message = message
                        });
                }
            }
            catch
            {
               
            }
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            var idValue = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? user.FindFirst("sub")?.Value
                ?? user.FindFirst("id")?.Value;

            return int.TryParse(idValue, out var parsed) ? parsed : (int?)null;
        }

        private static (string title, string message) BuildNotification(string method, string path)
        {
            var normalizedPath = path.ToLowerInvariant();
            var actionVerb = method switch
            {
                "POST" => "created",
                "PUT" => "updated",
                "DELETE" => "deleted",
                "PATCH" => "changed",
                _ => "performed"
            };

            if (normalizedPath.Contains("/orders/") && normalizedPath.Contains("/status") && method.Equals("PUT", StringComparison.OrdinalIgnoreCase))
            {
                return ("Order status updated", "Order status was updated successfully.");
            }

            if (normalizedPath.Contains("/shipments/") && normalizedPath.Contains("/start") && method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                return ("Shipment started", "Shipment processing has been started.");
            }

            if (normalizedPath.Contains("/shipments/") && normalizedPath.Contains("/complete") && method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                return ("Shipment completed", "Shipment has been completed successfully.");
            }

            if (normalizedPath.Contains("/shipments/") && normalizedPath.Contains("/assign") && method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                return ("Shipment assigned", "A shipment has been assigned successfully.");
            }

            if (normalizedPath.Contains("/orders/") && normalizedPath.Contains("/cancel") && method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                return ("Order cancelled", "Order has been cancelled successfully.");
            }

            var resource = ExtractResource(normalizedPath);
            var title = CultureInfo.CurrentCulture.TextInfo.ToTitleCase($"{resource} {actionVerb}");
            var message = $"{resource} was {actionVerb} successfully.";
            return (title, message);
        }

        private static IEnumerable<string> GetNotificationTargetRoles(string path, string method)
        {
            var normalizedPath = path.ToLowerInvariant();
            var roles = new List<string>();

            if (normalizedPath.Contains("/orders") || normalizedPath.Contains("/shipments"))
            {
                roles.Add("Manager");
            }

            if ((normalizedPath.Contains("/shipments") || normalizedPath.Contains("/tracking")) && method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                roles.Add("Driver");
            }

            if (normalizedPath.Contains("/inventory") || normalizedPath.Contains("/warehouse"))
            {
                roles.Add("WarehouseStaff");
            }

            if (normalizedPath.Contains("/suppliers") || normalizedPath.Contains("/supplier"))
            {
                roles.Add("Supplier");
            }

            if (normalizedPath.Contains("/reports"))
            {
                roles.Add("Manager");
            }

            if (normalizedPath.Contains("/auth") || normalizedPath.Contains("/users") || normalizedPath.Contains("/roles"))
            {
                roles.Add("Admin");
            }

            return roles.Distinct(StringComparer.OrdinalIgnoreCase);
        }

        private static string ExtractResource(string normalizedPath)
        {
            var segments = normalizedPath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length == 0)
            {
                return "item";
            }

            if (segments[0] == "api")
            {
                segments = segments.Skip(1).ToArray();
            }

            if (segments.Length >= 2 && int.TryParse(segments[1], out _))
            {
                return segments[0].TrimEnd('s');
            }

            var candidate = segments[0];
            if (candidate.EndsWith("s", StringComparison.OrdinalIgnoreCase))
            {
                return candidate[..^1];
            }

            return candidate;
        }

        private void AddInternalAuthHeader(HttpClient client)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? _configuration["JwtSettings:Key"] ?? "YourSuperSecretKeyForJWTThatIsAtLeast32CharactersLong123!";
            var issuer = _configuration["Jwt:Issuer"] ?? "Logjistika";
            var audience = _configuration["Jwt:Audience"] ?? "LogjistikaClients";

            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, "0"),
                    new Claim(ClaimTypes.Name, "system"),
                    new Claim(ClaimTypes.Role, "System")
                }),
                Issuer = issuer,
                Audience = audience,
                Expires = DateTime.UtcNow.AddMinutes(15),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)), SecurityAlgorithms.HmacSha256)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenHandler.WriteToken(token));
            client.DefaultRequestHeaders.Add("X-Internal-Request", "true");
        }
    }
}
