namespace SupplierService.DTOs
{
    public class SupplierOrderDto
    {
        public int Id { get; set; }
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<SupplierOrderItemDto> Items { get; set; } = new();
    }
}