namespace ReportService.DTOs
{
    public class GenerateReportDto
    {
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? UserId { get; set; }
        public int? ProductId { get; set; }
        public int? OrderId { get; set; }
    }
}