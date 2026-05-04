namespace InventoryService.DTOs
{
    public class LowStockAlertDto
    {
        public int Id { get; set; }
        public int InventoryId { get; set; }
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public int CurrentQuantity { get; set; }
        public int ThresholdLevel { get; set; }
        public bool IsResolved { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}