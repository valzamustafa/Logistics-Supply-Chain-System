using System.ComponentModel.DataAnnotations;

namespace TrackingService.Models
{
    public class Tracking : BaseEntity
    {
        [Required]
        public int ShipmentId { get; set; }
        
        [Required, MaxLength(50)]
        public string CurrentStatus { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? CurrentLocation { get; set; }
        
        public DateTime? LastUpdateTime { get; set; }
        public DateTime? ActualDeliveryDate { get; set; }
        [Required]
        public DateTime EstimatedDeliveryDate { get; set; }
    }
}
