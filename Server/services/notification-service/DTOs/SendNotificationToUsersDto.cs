namespace NotificationService.DTOs
{
    public class SendNotificationToUsersDto
    {
        public List<int> UserIds { get; set; } = new List<int>();
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? ActionUrl { get; set; }
    }
}