namespace SupplierService.DTOs
{
    public class SupplierRequestDto
    {
        public int Id { get; set; }
        public int WarehouseId { get; set; }
        public int RequestedBy { get; set; }
        public string? ProductCategory { get; set; }
        public string? ProductName { get; set; }
        public int? QuantityNeeded { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Urgency { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}
