namespace SupplierService.DTOs
{
    public class ConfirmShipmentRequestDto
    {
        public string? TrackingNumber { get; set; }
        public string? Notes { get; set; }
        public DateTime? ActualDeliveryDate { get; set; }
    }
}