using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryService.Models
{
    public class LowStockAlert : BaseEntity  
    {
        [Required]
        public int InventoryId { get; set; }
        
        [Required]
        public int ProductId { get; set; }
        
        [Required]
        public int CurrentQuantity { get; set; }
        
        [Required]
        public int ThresholdLevel { get; set; }
        
        [Required]
        public bool IsResolved { get; set; }
        
        public DateTime? ResolvedAt { get; set; }
        
        [ForeignKey(nameof(InventoryId))]
        public virtual Inventory Inventory { get; set; } = null!;
    }
}