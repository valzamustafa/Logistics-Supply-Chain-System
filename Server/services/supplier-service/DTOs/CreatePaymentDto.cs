namespace SupplierService.DTOs
{
    public class CreatePaymentDto
    {
        public int PurchaseOrderId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? TransactionId { get; set; }
        public string? Notes { get; set; }
    }

    public class PaymentResponseDto
    {
        public int Id { get; set; }
        public int PurchaseOrderId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? TransactionId { get; set; }
        public DateTime PaymentDate { get; set; }
    }
}