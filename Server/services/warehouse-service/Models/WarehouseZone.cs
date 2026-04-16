using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WarehouseService.Models
{
    public class WarehouseZone
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int WarehouseId { get; set; }
        
        [Required, MaxLength(50)]
        public string ZoneName { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? Description { get; set; }
        
        public int Capacity { get; set; }
        
        public int CreatedBy { get; set; }
        public int UpdatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        [ForeignKey(nameof(WarehouseId))]
        public virtual Warehouse Warehouse { get; set; } = null!;
    }
}