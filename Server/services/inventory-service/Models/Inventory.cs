using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryService.Models
{
    public class Inventory : BaseEntity 
    {
        [Required]
        public int ProductId { get; set; }
        
        [Required]
        public int WarehouseId { get; set; }
        
        [Required]
        public int Quantity { get; set; }
        
        public int ReservedQuantity { get; set; }
        
        public int? ReorderLevel { get; set; }
        
        
    }
}
