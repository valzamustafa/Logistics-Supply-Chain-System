using System.ComponentModel.DataAnnotations;

namespace ReportService.Models
{
    public class Report : BaseEntity
    {
        [Required, MaxLength(100)]
        public string Type { get; set; } = string.Empty;
        
        [Required, MaxLength(255)]
        public string? Name { get; set; }
        
        public string? Data { get; set; }
        
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        
        public int GeneratedBy { get; set; }
    }
}