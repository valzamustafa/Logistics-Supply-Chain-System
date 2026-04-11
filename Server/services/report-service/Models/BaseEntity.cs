using System.ComponentModel.DataAnnotations;

namespace ReportService.Models
{
    public abstract class BaseEntity
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int CreatedBy { get; set; }
        
        [Required]
        public int UpdatedBy { get; set; }
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
