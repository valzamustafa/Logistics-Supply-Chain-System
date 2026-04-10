using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace ShipmentService.Models
{
    public class ShipmentRoute : BaseEntity
    {
        [Required]
        public int ShipmentId { get; set; }
        
        [Required, MaxLength(255)]
        public string FromLocation { get; set; } = string.Empty;
        
        [Required, MaxLength(255)]
        public string ToLocation { get; set; } = string.Empty;
        
        public int SequenceOrder { get; set; }
        
        public DateTime? DepartureTime { get; set; }
        public DateTime? ArrivalTime { get; set; }
        
        public virtual Shipment Shipment { get; set; } = null!;
    }
}