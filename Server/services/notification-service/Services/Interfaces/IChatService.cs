using NotificationService.DTOs;

namespace NotificationService.Services.Interfaces
{
    public interface IChatService
    {
        Task<IEnumerable<ChatMessageDto>> GetConversationAsync(int userA, int userB);
        Task<IEnumerable<ChatConversationDto>> GetConversationsAsync(int userId);
        Task<ChatMessageDto> SendMessageAsync(int senderId, int recipientId, string message);
        Task<int> GetUnreadCountAsync(int userId);
        Task<int> MarkConversationReadAsync(int userId, int otherUserId);
    }
}
