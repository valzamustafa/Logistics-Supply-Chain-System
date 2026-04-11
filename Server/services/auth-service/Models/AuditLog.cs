using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    public class AuditLog
    {
        [Key]
        public int Id { get; set; }
        
        public int? UserId { get; set; }
        
        [Required, MaxLength(50)]
        public string Action { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string Entity { get; set; } = string.Empty;
        
        public int? EntityId { get; set; }
        
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        
        [MaxLength(45)]
        public string? IpAddress { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [ForeignKey(nameof(UserId))]
        public virtual User? User { get; set; }
    }
}