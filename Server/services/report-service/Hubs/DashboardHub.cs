using Microsoft.AspNetCore.SignalR;

namespace ReportService.Hubs
{
    public class DashboardHub : Hub
    {
        public async Task SendStatsUpdate(object stats)
        {
            await Clients.All.SendAsync("ReceiveStatsUpdate", stats);
        }

        public async Task SendReportUpdate(object report)
        {
            await Clients.All.SendAsync("ReceiveReportUpdate", report);
        }
    }
}