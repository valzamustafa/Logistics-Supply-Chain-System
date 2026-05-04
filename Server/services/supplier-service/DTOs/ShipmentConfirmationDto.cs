
namespace SupplierService.DTOs
{
    public class ShipmentConfirmationDto
    {
        public DateTime? ActualDeliveryDate { get; set; }
        public string? Notes { get; set; }
        public string? TrackingNumber { get; set; }  
        public string? Location { get; set; }        
    }
}