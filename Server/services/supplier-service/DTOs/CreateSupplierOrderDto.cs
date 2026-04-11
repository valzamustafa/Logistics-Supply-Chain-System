namespace SupplierService.DTOs
{
    public class CreateSupplierOrderDto
    {
        public int SupplierId { get; set; }
        public List<CreateSupplierOrderItemDto> Items { get; set; } = new();
    }
}