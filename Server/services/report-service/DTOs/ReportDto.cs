namespace ReportService.DTOs
{
    public class ReportDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Data { get; set; }
        public DateTime GeneratedAt { get; set; }
        public int GeneratedBy { get; set; }
    }
}