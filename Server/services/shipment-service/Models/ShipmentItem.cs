using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShipmentService.Models;

public class ShipmentItem
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int ShipmentId { get; set; }
    
    [Required]
    public int ProductId { get; set; }
    
    [Required]
    public int Quantity { get; set; }
    
    public string? ProductName { get; set; }
    public decimal? UnitPrice { get; set; }
    
    [ForeignKey("ShipmentId")]
    public virtual Shipment? Shipment { get; set; }
}
