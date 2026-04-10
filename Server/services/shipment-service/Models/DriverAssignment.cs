using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShipmentService.Models
{
    public class DriverAssignment : BaseEntity
    {
        [Required]
        public int DriverId { get; set; }
        
        [Required]
        public int ShipmentId { get; set; }
        
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        
        public virtual Driver Driver { get; set; } = null!;
        public virtual Shipment Shipment { get; set; } = null!;
    }
}