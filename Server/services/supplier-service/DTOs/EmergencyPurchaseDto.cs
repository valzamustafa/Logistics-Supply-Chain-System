namespace SupplierService.DTOs
{
    public class EmergencyPurchaseDto
    {
        public int Id { get; set; }
        public int WarehouseId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string? SupplierName { get; set; }
        public string? SupplierContact { get; set; }
        public string? InvoiceNumber { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? TotalAmount { get; set; }
        public string? Reason { get; set; }
        public bool IsResolved { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}
