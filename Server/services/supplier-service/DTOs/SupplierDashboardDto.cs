namespace SupplierService.DTOs
{
    public class SupplierDashboardDto
    {
        public int SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string? SupplierEmail { get; set; }
        public string? SupplierContactPerson { get; set; }
        public string? SupplierPhone { get; set; }
        public List<int> WarehouseIds { get; set; } = new();
        public List<PurchaseOrderDto> Orders { get; set; } = new();
    }
}
