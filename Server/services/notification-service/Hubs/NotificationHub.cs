using Microsoft.AspNetCore.SignalR;

namespace NotificationService.Hubs
{
    public class NotificationHub : Hub
    {
        public async Task SubscribeToUser(int userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GetGroupName(userId));
        }

        public async Task UnsubscribeFromUser(int userId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetGroupName(userId));
        }

        private static string GetGroupName(int userId) => $"user-{userId}";
    }
}
