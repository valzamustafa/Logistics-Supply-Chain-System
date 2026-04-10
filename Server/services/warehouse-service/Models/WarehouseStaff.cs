using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WarehouseService.Models
{
    public class WarehouseStaff : BaseEntity
    {
        [Required]
        public int UserId { get; set; }
        
        [Required]
        public int WarehouseId { get; set; }
        
        [MaxLength(50)]
        public string? Position { get; set; }
        
        public DateTime? HireDate { get; set; }
        
        public virtual Warehouse Warehouse { get; set; } = null!;
    }
}