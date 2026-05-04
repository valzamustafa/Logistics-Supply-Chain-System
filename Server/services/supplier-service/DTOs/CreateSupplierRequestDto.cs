namespace SupplierService.DTOs
{
    public class CreateSupplierRequestDto
    {
        public int WarehouseId { get; set; }
        public int RequestedBy { get; set; }
        public string? ProductCategory { get; set; }
        public string? ProductName { get; set; }
        public int? QuantityNeeded { get; set; }
        public string? Urgency { get; set; }
        public string? Notes { get; set; }
    }
}
