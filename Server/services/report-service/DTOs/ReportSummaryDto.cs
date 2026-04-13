namespace ReportService.DTOs
{
  public class ReportSummaryDto
    {
        public int TotalReports { get; set; }
        public int ReportsThisWeek { get; set; }
        public int ReportsThisMonth { get; set; }
        public Dictionary<string, int> ReportsByType { get; set; } = new();
    }
}