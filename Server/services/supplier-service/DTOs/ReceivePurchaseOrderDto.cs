namespace SupplierService.DTOs
{
    public class ReceivePurchaseOrderDto
    {
        public string PONumber { get; set; } = string.Empty;
        public DateTime? ActualDeliveryDate { get; set; }
    }
}
