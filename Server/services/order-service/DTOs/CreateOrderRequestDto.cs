namespace OrderService.DTOs
{
    public class CreateOrderRequestDto
    {
        public int UserId { get; set; }
        public int? WarehouseId { get; set; }
        public string? ShippingAddress { get; set; }
        public string? BillingAddress { get; set; }
        public string? PaymentMethod { get; set; }
        public string? PaymentReference { get; set; }
        public InvoiceInfoDto? Invoice { get; set; }
        public List<CreateOrderItemDto> Items { get; set; } = new();
    }

    public class InvoiceInfoDto
    {
        public string? BankAccount { get; set; }
        public string? BillingName { get; set; }
        public string? BillingEmail { get; set; }
        public string? BillingPhone { get; set; }
    }
}