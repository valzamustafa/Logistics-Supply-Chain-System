using System;

namespace NotificationService.DTOs
{
    public class ChatConversationDto
    {
        public int PartnerId { get; set; }
        public string LastMessage { get; set; } = string.Empty;
        public DateTime LastSentAt { get; set; }
        public int UnreadCount { get; set; }
    }
}
