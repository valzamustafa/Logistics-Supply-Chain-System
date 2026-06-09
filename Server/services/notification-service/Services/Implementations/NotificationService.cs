using System.Linq;
using System.Net.Http.Json;
using Microsoft.AspNetCore.SignalR;
using NotificationService.DTOs;
using NotificationService.Hubs;
using NotificationService.Models;
using NotificationService.Repositories.Interfaces;
using NotificationService.Services.Interfaces;

namespace NotificationService.Business
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _repository;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public NotificationService(
            INotificationRepository repository,
            IHubContext<NotificationHub> hubContext,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _repository = repository;
            _hubContext = hubContext;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        public async Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId, int? take = 30)
        {
            var notifications = await _repository.GetByUserAsync(userId, take);
            return notifications.Select(MapToDto);
        }

        public async Task<IEnumerable<NotificationDto>> GetUnreadNotificationsAsync(int userId)
        {
            var notifications = await _repository.GetUnreadByUserAsync(userId);
            return notifications.Select(MapToDto);
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            var unread = await _repository.GetUnreadByUserAsync(userId);
            return unread.Count();
        }

        public async Task<NotificationDto> SendNotificationAsync(SendNotificationDto dto)
        {
            var notification = await CreateNotificationAsync(dto.UserId, dto.Type, dto.Title, dto.Message, dto.ActionUrl);
           
            try
            {
                await _hubContext.Clients.Group($"user-{dto.UserId}").SendAsync("ReceiveNotification", notification);
                await _hubContext.Clients.Group($"user-{dto.UserId}").SendAsync("EntityUpdated", new { Type = dto.Type, Notification = notification });
            }
            catch
            {
             
            }
            return notification;
        }

        public async Task<IEnumerable<NotificationDto>> SendNotificationToRoleAsync(SendNotificationToRoleDto dto)
        {
            var userIds = await GetUserIdsByRoleAsync(dto.Role);
            if (!userIds.Any())
            {
                return Enumerable.Empty<NotificationDto>();
            }

            return await SendNotificationsToUsersAsync(userIds, dto.Type, dto.Title, dto.Message, dto.ActionUrl);
        }

        public async Task<IEnumerable<NotificationDto>> SendNotificationToUsersAsync(SendNotificationToUsersDto dto)
        {
            return await SendNotificationsToUsersAsync(dto.UserIds, dto.Type, dto.Title, dto.Message, dto.ActionUrl);
        }

        public async Task MarkAsReadAsync(int notificationId)
        {
            var notification = await _repository.GetByIdAsync(notificationId);
            if (notification != null && !notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                await _repository.UpdateAsync(notification);
            }
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            await _repository.MarkAllAsReadAsync(userId);
        }

        private async Task<IEnumerable<NotificationDto>> SendNotificationsToUsersAsync(IEnumerable<int> userIds, string type, string title, string message, string? actionUrl)
        {
            var results = new List<NotificationDto>();
            foreach (var userId in userIds.Distinct())
            {
                var notification = await CreateNotificationAsync(userId, type, title, message, actionUrl);
                results.Add(notification);
                try
                {
                    await _hubContext.Clients.Group($"user-{userId}").SendAsync("ReceiveNotification", notification);
                    await _hubContext.Clients.Group($"user-{userId}").SendAsync("EntityUpdated", new { Type = type, Notification = notification });
                }
                catch
                {
                  
                }
            }
            return results;
        }

        private async Task<NotificationDto> CreateNotificationAsync(int userId, string type, string title, string message, string? actionUrl)
        {
            var notification = new Notification
            {
                UserId = userId,
                Type = type,
                Title = title,
                Message = message,
                ActionUrl = actionUrl,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            var created = await _repository.CreateAsync(notification);
            return MapToDto(created);
        }

        private async Task<IEnumerable<int>> GetUserIdsByRoleAsync(string roleName)
        {
            var authServiceUrl = _configuration["AuthServiceUrl"] ?? "http://localhost:5001";
            using var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(authServiceUrl.TrimEnd('/') + "/");

            try
            {
                var response = await client.GetAsync($"api/auth/roles/{Uri.EscapeDataString(roleName)}/users");
                if (!response.IsSuccessStatusCode)
                {
                    return Enumerable.Empty<int>();
                }

                var userIds = await response.Content.ReadFromJsonAsync<List<int>>();
                return userIds ?? Enumerable.Empty<int>();
            }
            catch
            {
                return Enumerable.Empty<int>();
            }
        }

        private NotificationDto MapToDto(Notification notification)
        {
            return new NotificationDto
            {
                Id = notification.Id,
                UserId = notification.UserId,
                Type = notification.Type,
                Title = notification.Title,
                Message = notification.Message,
                ActionUrl = notification.ActionUrl,
                IsRead = notification.IsRead,
                ReadAt = notification.ReadAt,
                CreatedAt = notification.CreatedAt
            };
        }
    }
}