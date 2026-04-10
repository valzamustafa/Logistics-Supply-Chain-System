using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace ShipmentService.Models
{
    public class ShipmentItem : BaseEntity
    {
        [Required]
        public int ShipmentId { get; set; }
        
        [Required]
        public int ProductId { get; set; }
        
        [Required]
        public int Quantity { get; set; }
        
        public virtual Shipment Shipment { get; set; } = null!;
    }
}