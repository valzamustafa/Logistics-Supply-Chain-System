using Microsoft.AspNetCore.SignalR;

namespace ShipmentService.Hubs;

public class DashboardHub : Hub
{
    public async Task SendShipmentUpdate(object shipment)
    {
        await Clients.All.SendAsync("ReceiveShipmentUpdate", shipment);
    }
    
    public async Task SendNewShipment(object shipment)
    {
        await Clients.All.SendAsync("ReceiveNewShipment", shipment);
    }
    
    public async Task SendStatsUpdate(object stats)
    {
        await Clients.All.SendAsync("ReceiveStatsUpdate", stats);
    }
    
    public override async Task OnConnectedAsync()
    {
        await Clients.All.SendAsync("UserConnected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }
    
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Clients.All.SendAsync("UserDisconnected", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}