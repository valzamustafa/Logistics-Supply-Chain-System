namespace NotificationService.DTOs
{
    public class SendChatDto
    {
        public int SenderId { get; set; }
        public int RecipientId { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
