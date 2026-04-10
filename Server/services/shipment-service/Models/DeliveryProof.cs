using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShipmentService.Models
{
    public class DeliveryProof
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int ShipmentId { get; set; }
        
        [Required, MaxLength(500)]
        public string ImageUrl { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? SignatureData { get; set; }
        
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        
        [ForeignKey(nameof(ShipmentId))]
        public virtual Shipment Shipment { get; set; } = null!;
    }
}