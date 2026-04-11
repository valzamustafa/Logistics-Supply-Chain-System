using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryService.Models
{
    public class StockMovement : BaseEntity
    {
        [Required]
        public int InventoryId { get; set; }
        
        [Required]
        public int ProductId { get; set; }
        
        [Required]
        public int Quantity { get; set; }
        
        [Required, MaxLength(50)]
        public string Type { get; set; } = string.Empty; 
        
        [MaxLength(50)]
        public string? ReferenceType { get; set; } 
        
        public int? ReferenceId { get; set; }
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        public DateTime MovementDate { get; set; } = DateTime.UtcNow;
        
        public virtual Inventory Inventory { get; set; } = null!;
    }
}
