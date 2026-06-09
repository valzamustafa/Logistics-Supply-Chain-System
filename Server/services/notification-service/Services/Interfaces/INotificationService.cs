using NotificationService.DTOs;

namespace NotificationService.Services.Interfaces
{
    public interface INotificationService
    {
        Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId, int? take = 30);
        Task<IEnumerable<NotificationDto>> GetUnreadNotificationsAsync(int userId);
        Task<int> GetUnreadCountAsync(int userId);
        Task<NotificationDto> SendNotificationAsync(SendNotificationDto dto);
        Task<IEnumerable<NotificationDto>> SendNotificationToRoleAsync(SendNotificationToRoleDto dto);
        Task<IEnumerable<NotificationDto>> SendNotificationToUsersAsync(SendNotificationToUsersDto dto);
        Task MarkAsReadAsync(int notificationId);
        Task MarkAllAsReadAsync(int userId);
    }
}