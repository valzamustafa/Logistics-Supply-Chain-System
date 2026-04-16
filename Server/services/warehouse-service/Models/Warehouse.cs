using System.ComponentModel.DataAnnotations;

namespace WarehouseService.Models
{
    public class Warehouse
    {
        [Key]
        public int Id { get; set; }
        
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Location { get; set; }
        
        [MaxLength(20)]
        public string? Phone { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public int CreatedBy { get; set; }
        public int UpdatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public virtual ICollection<WarehouseZone> Zones { get; set; } = new List<WarehouseZone>();
        public virtual ICollection<WarehouseStaff> Staff { get; set; } = new List<WarehouseStaff>();
        public virtual ICollection<WarehouseStock> Stocks { get; set; } = new List<WarehouseStock>(); 
    }
}