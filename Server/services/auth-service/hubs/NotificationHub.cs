using Microsoft.AspNetCore.SignalR;

namespace AuthService.Hubs
{
    public class NotificationHub : Hub
    {
        public async Task SendNotification(string userId, string title, string message)
        {
            await Clients.User(userId).SendAsync("ReceiveNotification", new
            {
                Id = Guid.NewGuid(),
                Title = title,
                Message = message,
                CreatedAt = DateTime.UtcNow
            });
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            if (userId != null)
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            await base.OnConnectedAsync();
        }
    }
}