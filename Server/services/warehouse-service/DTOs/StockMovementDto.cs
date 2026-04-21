using WarehouseService.Models;

namespace WarehouseService.DTOs
{
    public class StockMovementDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public MovementType Type { get; set; }
        public string TypeName { get; set; } = string.Empty;  
        public int Quantity { get; set; }
        public int PreviousQuantity { get; set; }
        public int NewQuantity { get; set; }
        public string? Reference { get; set; }
        public int? SourceWarehouseId { get; set; }
        public string? SourceWarehouseName { get; set; }
        public int? DestinationWarehouseId { get; set; }
        public string? DestinationWarehouseName { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
    }
}
