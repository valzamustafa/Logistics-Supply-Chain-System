using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShipmentService.Models
{
    public class Shipment : BaseEntity  
    {
        [Required, MaxLength(50)]
        public string TrackingNumber { get; set; } = string.Empty;
        
        [Required]
        public int OrderId { get; set; }
        
        public int? DriverId { get; set; }
        
        public int? VehicleId { get; set; }
        
        [Required, MaxLength(50)]
        public string Status { get; set; } = "Pending";
        
        [Required]
        public DateTime EstimatedDeliveryDate { get; set; }
        
        public DateTime? ActualDeliveryDate { get; set; }
        
        [MaxLength(500)]
        public string? ShippingAddress { get; set; }
       
        [ForeignKey(nameof(DriverId))]
        public virtual Driver? Driver { get; set; }
        
        [ForeignKey(nameof(VehicleId))]
        public virtual Vehicle? Vehicle { get; set; }
        
        public virtual ICollection<ShipmentItem> Items { get; set; } = new List<ShipmentItem>();
    }
}