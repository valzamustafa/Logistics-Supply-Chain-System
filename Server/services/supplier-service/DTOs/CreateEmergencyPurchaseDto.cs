namespace SupplierService.DTOs
{
    public class CreateEmergencyPurchaseDto
    {
        public int WarehouseId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string? SupplierName { get; set; }
        public string? SupplierContact { get; set; }
        public string? InvoiceNumber { get; set; }
        public decimal UnitPrice { get; set; }
        public string? Reason { get; set; }
    }
}
