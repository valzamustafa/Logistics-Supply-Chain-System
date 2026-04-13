using NotificationService.Models;

namespace NotificationService.Repositories.Interfaces
{
    public interface INotificationRepository
    {
        Task<Notification?> GetByIdAsync(int id);
        Task<IEnumerable<Notification>> GetByUserAsync(int userId);
        Task<IEnumerable<Notification>> GetUnreadByUserAsync(int userId);
        Task<Notification> CreateAsync(Notification notification);
        Task<Notification> UpdateAsync(Notification notification);
        Task MarkAllAsReadAsync(int userId);
        Task DeleteOldAsync(int daysOld);
    }
}