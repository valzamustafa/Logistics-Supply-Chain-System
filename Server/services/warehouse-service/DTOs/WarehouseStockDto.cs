namespace WarehouseService.DTOs
{
    public class WarehouseStockDto
    {
        public int Id { get; set; }
        public int WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductSku { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int MinimumStockLevel { get; set; }
        public int MaximumStockLevel { get; set; }
        public string? ShelfLocation { get; set; }
        public bool IsLowStock { get; set; }     
        public bool IsOutOfStock { get; set; }  
        public bool IsOverstock { get; set; }   
    }
}