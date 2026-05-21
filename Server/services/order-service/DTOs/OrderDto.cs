namespace OrderService.DTOs
{
    public class OrderDto
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public int UserId { get; set; }
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? TaxAmount { get; set; }
        public decimal? ShippingCost { get; set; }
        public string Status { get; set; } = string.Empty;
        
   
        public int? WarehouseId { get; set; }
        public string? ProcessingStatus { get; set; }
        public int? ShipmentId { get; set; }
        public string? PaymentMethod { get; set; }
        public string? PaymentReference { get; set; }
        public string? BankAccount { get; set; }
        public string? BillingName { get; set; }
        public string? BillingEmail { get; set; }
        public string? BillingPhone { get; set; }
        
        public string? ShippingAddress { get; set; }
        public string? BillingAddress { get; set; }
        public DateTime? ShippedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public List<OrderItemDto> Items { get; set; } = new();
    }
}