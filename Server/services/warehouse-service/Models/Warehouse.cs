using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WarehouseService.Models
{
    public class Warehouse : BaseEntity
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Location { get; set; }
        
        [MaxLength(20)]
        public string? Phone { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public virtual ICollection<WarehouseZone> Zones { get; set; } = new List<WarehouseZone>();
        public virtual ICollection<WarehouseStaff> Staff { get; set; } = new List<WarehouseStaff>();
    }
}