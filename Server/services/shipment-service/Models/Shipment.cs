using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShipmentService.Models;

public class Shipment
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public string TrackingNumber { get; set; } = string.Empty;
    
    [Required]
    public int OrderId { get; set; }
    
    public int? DriverId { get; set; }
    public int? VehicleId { get; set; }
    
    [Required]
    public string Status { get; set; } = "Pending";
    
    public int Priority { get; set; } = 1; 
    public string? CurrentLocation { get; set; }
public DateTime? LastLocationUpdate { get; set; }
public double? CustomerRating { get; set; }
public string? CustomerFeedback { get; set; }
    [Required]
    public DateTime EstimatedDeliveryDate { get; set; }
    
    public DateTime? ActualDeliveryDate { get; set; }
    public string? ShippingAddress { get; set; }
    public string? PickupLocation { get; set; }
    public string? DeliveryLocation { get; set; }
    public decimal? Distance { get; set; }
    public string? ETA { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public int? CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    
    // Navigation properties
    public virtual Driver? Driver { get; set; }
    public virtual Vehicle? Vehicle { get; set; }
    public virtual ICollection<ShipmentItem> Items { get; set; } = new List<ShipmentItem>();
}