namespace SupplierService.DTOs
{
    public class SupplierProductDto
    {
        public int Id { get; set; }
        public int SupplierId { get; set; }
        public int ProductId { get; set; }
        public string? SupplierSKU { get; set; }
        public decimal? LeadTimeDays { get; set; }
    }
}
