namespace OrderService.DTOs
{
    public class CreateOrderRequestDto
    {
        public int UserId { get; set; }
        public string? ShippingAddress { get; set; }
        public string? BillingAddress { get; set; }
        public List<CreateOrderItemDto> Items { get; set; } = new();
    }
}