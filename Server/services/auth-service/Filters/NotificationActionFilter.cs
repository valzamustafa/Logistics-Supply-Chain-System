using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace AuthService.Filters
{
    public class NotificationActionFilter : IAsyncActionFilter
    {
        private readonly ILogger<NotificationActionFilter> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public NotificationActionFilter(
            ILogger<NotificationActionFilter> logger,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var resultContext = await next();
            

            if (resultContext.Exception == null && resultContext.HttpContext.Response.StatusCode >= 200 && resultContext.HttpContext.Response.StatusCode < 300)
            {
                var actionName = resultContext.ActionDescriptor.RouteValues["action"];
                var controllerName = resultContext.ActionDescriptor.RouteValues["controller"];
                
                _logger.LogInformation("Action {Action} in {Controller} completed successfully at {Time}", 
                    actionName, controllerName, DateTime.UtcNow);
                     
                await SendNotificationForAction(context, resultContext, actionName, controllerName);
            }
            else if (resultContext.Exception != null)
            {
                _logger.LogError(resultContext.Exception, "Action failed");
            }
        }

        private async Task SendNotificationForAction(ActionExecutingContext context, ActionExecutedContext resultContext, string? actionName, string? controllerName)
        {
            try
            {
                var notificationServiceUrl = _configuration["Services:NotificationService"] ?? "http://localhost:5003";
                var client = _httpClientFactory.CreateClient();     
               
                if (actionName == "Register" && controllerName == "Auth")
                {
                    var registerDto = context.ActionArguments.Values.FirstOrDefault();
                    if (registerDto != null)
                    {
                        var email = registerDto.GetType().GetProperty("Email")?.GetValue(registerDto)?.ToString();
                        var firstName = registerDto.GetType().GetProperty("FirstName")?.GetValue(registerDto)?.ToString();
                        var lastName = registerDto.GetType().GetProperty("LastName")?.GetValue(registerDto)?.ToString();
                        
                        var notification = new
                        {
                            role = "Admin",
                            type = "UserRegistration",
                            title = "New User Registered",
                            message = $"New user {firstName} {lastName} ({email}) has registered in the system.",
                            actionUrl = "/admin/users"
                        };
                        
                        var content = new StringContent(JsonSerializer.Serialize(notification), System.Text.Encoding.UTF8, "application/json");
                        await client.PostAsync($"{notificationServiceUrl}/api/notifications/send-to-role", content);
                    }
                }
                
             
                if (actionName == "AssignRole" && controllerName == "Auth")
                {
                    var notification = new
                    {
                        role = "Admin",
                        type = "RoleAssignment",
                        title = "Role Assigned",
                        message = $"A user has been assigned a new role in the system.",
                        actionUrl = "/admin/users"
                    };
                    
                    var content = new StringContent(JsonSerializer.Serialize(notification), System.Text.Encoding.UTF8, "application/json");
                    await client.PostAsync($"{notificationServiceUrl}/api/notifications/send-to-role", content);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send notification from action filter");
            }
        }
    }
}