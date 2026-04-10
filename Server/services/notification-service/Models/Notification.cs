using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NotificationService.Models
{
    public class Notification : BaseEntity
    {
        [Required]
        public int UserId { get; set; }
        
        [Required, MaxLength(50)]
        public string Type { get; set; } = string.Empty;
        
        [Required, MaxLength(255)]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        public string Message { get; set; } = string.Empty;
        
        public bool IsRead { get; set; } = false;
        
        public DateTime? ReadAt { get; set; }
        
        [MaxLength(500)]
        public string? ActionUrl { get; set; }
        
       
    }
}