using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WarehouseService.Models
{
    public class StockMovement : BaseEntity
    {
        [Required]
        public int WarehouseStockId { get; set; }
        
        [Required]
        public int ProductId { get; set; }
        
        [Required]
        public MovementType Type { get; set; }
        
        [Required]
        public int Quantity { get; set; }
        
        public int PreviousQuantity { get; set; }
        
        public int NewQuantity { get; set; }
        
        [MaxLength(500)]
        public string? Reference { get; set; } 
        
        public int? SourceWarehouseId { get; set; } 
        
        public int? DestinationWarehouseId { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        [ForeignKey(nameof(WarehouseStockId))]
        public virtual WarehouseStock WarehouseStock { get; set; } = null!;
        
     
        [NotMapped]
        public string? SourceWarehouseName { get; set; }
        
        [NotMapped]
        public string? DestinationWarehouseName { get; set; }
        
        [NotMapped]
        public string? ProductName { get; set; }
    }
    
    
}