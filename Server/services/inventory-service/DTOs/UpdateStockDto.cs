   namespace InventoryService.DTOs
{
    public class UpdateStockDto
    {
        public int ProductId { get; set; }
        public int WarehouseId { get; set; }
        public int Quantity { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? ReferenceType { get; set; }
        public int? ReferenceId { get; set; }
        public string? Notes { get; set; }
    }
}