using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace ShipmentService.Models
{
    public class Vehicle : BaseEntity
    {
        [Required, MaxLength(20)]
        public string PlateNumber { get; set; } = string.Empty;
        
        [Required, MaxLength(50)]
        public string Model { get; set; } = string.Empty;
        
        public int Capacity { get; set; }
        
        public bool IsAvailable { get; set; } = true;
        
        public virtual ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
    }
}