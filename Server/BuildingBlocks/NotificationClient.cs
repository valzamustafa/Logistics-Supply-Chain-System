using System.Text;
using System.Text.Json;

namespace BuildingBlocks
{
    public interface INotificationClient
    {
        Task SendNotificationAsync(int userId, string type, string title, string message, string? actionUrl = null);
        Task SendNotificationToRoleAsync(string role, string type, string title, string message, string? actionUrl = null);
        Task SendNotificationToMultipleUsersAsync(List<int> userIds, string type, string title, string message, string? actionUrl = null);
    }

    public class NotificationClient : INotificationClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<NotificationClient> _logger;
        private readonly string _notificationApiUrl;

        public NotificationClient(HttpClient httpClient, IConfiguration configuration, ILogger<NotificationClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _notificationApiUrl = configuration["Services:NotificationService"] ?? "http://localhost:5000";
        }

        public async Task SendNotificationAsync(int userId, string type, string title, string message, string? actionUrl = null)
        {
            try
            {
                var notificationDto = new
                {
                    userId = userId,
                    type = type,
                    title = title,
                    message = message,
                    actionUrl = actionUrl
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(notificationDto),
                    Encoding.UTF8,
                    "application/json");

                var response = await _httpClient.PostAsync($"{_notificationApiUrl}/api/notifications/send", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to send notification to user {UserId}: {StatusCode}", userId, response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending notification to user {UserId}", userId);
            }
        }

        public async Task SendNotificationToRoleAsync(string role, string type, string title, string message, string? actionUrl = null)
        {
            try
            {
                var notificationDto = new
                {
                    role = role,
                    type = type,
                    title = title,
                    message = message,
                    actionUrl = actionUrl
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(notificationDto),
                    Encoding.UTF8,
                    "application/json");

                var response = await _httpClient.PostAsync($"{_notificationApiUrl}/api/notifications/send-to-role", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to send notification to role {Role}: {StatusCode}", role, response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending notification to role {Role}", role);
            }
        }

        public async Task SendNotificationToMultipleUsersAsync(List<int> userIds, string type, string title, string message, string? actionUrl = null)
        {
            try
            {
                var notificationDto = new
                {
                    userIds = userIds,
                    type = type,
                    title = title,
                    message = message,
                    actionUrl = actionUrl
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(notificationDto),
                    Encoding.UTF8,
                    "application/json");

                var response = await _httpClient.PostAsync($"{_notificationApiUrl}/api/notifications/send-bulk", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to send bulk notifications: {StatusCode}", response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending bulk notifications");
            }
        }
    }
}