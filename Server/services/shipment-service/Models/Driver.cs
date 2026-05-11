using System.ComponentModel.DataAnnotations;

namespace ShipmentService.Models;

public class Driver
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    public string LicenseNumber { get; set; } = string.Empty;
    
    public string? PhoneNumber { get; set; }
    
    public bool IsAvailable { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public int? CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    
    public virtual ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
}