using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WarehouseService.Models
{
    public class WarehouseZone : BaseEntity
    {
        [Required]
        public int WarehouseId { get; set; }
        
        [Required, MaxLength(50)]
        public string ZoneName { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? Description { get; set; }
        
        public int Capacity { get; set; }
        
        public virtual Warehouse Warehouse { get; set; } = null!;
    }
}
