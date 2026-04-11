using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ReportService.Models
{
    public class ReportLog : BaseEntity
    {
        [Required]
        public int ReportId { get; set; }
        
        [Required, MaxLength(50)]
        public string Status { get; set; } = string.Empty;
        
        public string? ErrorMessage { get; set; }
        
        public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
        
        [ForeignKey(nameof(ReportId))]
        public virtual Report? Report { get; set; }
    }
}