using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WarehouseService.Models
{
    public class WarehouseStock : BaseEntity
    {
        [Required]
        public int WarehouseId { get; set; }
        
        [Required]
        public int ProductId { get; set; }
        
        [Required]
        public int Quantity { get; set; } = 0;
        
        public int MinimumStockLevel { get; set; } = 5; 
        
        public int MaximumStockLevel { get; set; } = 1000;
        
        public string? ShelfLocation { get; set; }
        
        [ForeignKey(nameof(WarehouseId))]
        public virtual Warehouse Warehouse { get; set; } = null!;
        
    
        public virtual ICollection<StockMovement> Movements { get; set; } = new List<StockMovement>();
        
  
        [NotMapped]
        public string? ProductName { get; set; }
        
        [NotMapped]
        public string? ProductSku { get; set; }
        public virtual ICollection<WarehouseStock> Stocks { get; set; } = new List<WarehouseStock>();
    }
}
