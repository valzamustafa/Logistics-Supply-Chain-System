using Microsoft.AspNetCore.SignalR;
using NotificationService.Data;
using NotificationService.DTOs;
using NotificationService.Hubs;
using NotificationService.Models;
using NotificationService.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace NotificationService.Services.Implementations
{
    public class ChatService : IChatService
    {
        private readonly NotificationDbContext _db;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly INotificationService _notificationService;

        public ChatService(NotificationDbContext db, IHubContext<ChatHub> hubContext, INotificationService notificationService)
        {
            _db = db;
            _hubContext = hubContext;
            _notificationService = notificationService;
        }

        public async Task<IEnumerable<ChatMessageDto>> GetConversationAsync(int userA, int userB)
        {
            var msgs = await _db.ChatMessages
                .Where(m => (m.SenderId == userA && m.RecipientId == userB) || (m.SenderId == userB && m.RecipientId == userA))
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            return msgs.Select(m => new ChatMessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                RecipientId = m.RecipientId,
                Message = m.Message,
                SentAt = m.SentAt,
                IsRead = m.IsRead
            });
        }

        public async Task<IEnumerable<ChatConversationDto>> GetConversationsAsync(int userId)
        {
            var msgs = await _db.ChatMessages
                .Where(m => m.SenderId == userId || m.RecipientId == userId)
                .OrderByDescending(m => m.SentAt)
                .ToListAsync();

            var conversations = msgs
                .GroupBy(m => m.SenderId == userId ? m.RecipientId : m.SenderId)
                .Select(g => {
                    var last = g.OrderByDescending(m => m.SentAt).First();
                    var unread = g.Count(msg => msg.RecipientId == userId && !msg.IsRead);
                    return new ChatConversationDto
                    {
                        PartnerId = g.Key,
                        LastMessage = last.Message,
                        LastSentAt = last.SentAt,
                        UnreadCount = unread
                    };
                })
                .OrderByDescending(c => c.LastSentAt)
                .ToList();

            return conversations;
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            var count = await _db.ChatMessages.CountAsync(m => m.RecipientId == userId && !m.IsRead);
            return count;
        }

        public async Task<int> MarkConversationReadAsync(int userId, int otherUserId)
        {
            var msgs = await _db.ChatMessages
                .Where(m => m.RecipientId == userId && m.SenderId == otherUserId && !m.IsRead)
                .ToListAsync();
            if (!msgs.Any()) return 0;
            foreach (var m in msgs) m.IsRead = true;
            await _db.SaveChangesAsync();

         
            try
            {
                var dto = new { Type = "chatRead", UserId = userId, OtherUserId = otherUserId, Count = msgs.Count };
                await _hubContext.Clients.Group($"user-{userId}").SendAsync("EntityUpdated", dto);
                await _hubContext.Clients.Group($"user-{otherUserId}").SendAsync("EntityUpdated", dto);
            }
            catch
            {
               
            }

            return msgs.Count;
        }

        public async Task<ChatMessageDto> SendMessageAsync(int senderId, int recipientId, string message)
        {
            var msg = new ChatMessage
            {
                SenderId = senderId,
                RecipientId = recipientId,
                Message = message,
                SentAt = DateTime.UtcNow,
                IsRead = false
            };

            _db.ChatMessages.Add(msg);
            await _db.SaveChangesAsync();

            var dto = new ChatMessageDto
            {
                Id = msg.Id,
                SenderId = msg.SenderId,
                RecipientId = msg.RecipientId,
                Message = msg.Message,
                SentAt = msg.SentAt,
                IsRead = msg.IsRead
            };

         
            try
            {
                await _hubContext.Clients.Group($"user-{recipientId}").SendAsync("ReceiveChatMessage", dto);
                await _hubContext.Clients.Group($"user-{senderId}").SendAsync("ReceiveChatMessage", dto);
            }
            catch
            {
            }

            
            try
            {
                await _notificationService.SendNotificationAsync(new SendNotificationDto
                {
                    UserId = recipientId,
                    Type = "ChatMessage",
                    Title = "New message",
                    Message = $"You have a new message from user {senderId}",
                    ActionUrl = $"/chat/{senderId}"
                });
            }
            catch
            {
                
            }

            return dto;
        }
    }
}
