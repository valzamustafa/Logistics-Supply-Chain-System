namespace SupplierService.DTOs

{
  public class CreateSupplierOrderItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }
}