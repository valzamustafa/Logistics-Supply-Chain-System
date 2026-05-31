   namespace TrackingService.DTOs
{
    public class CreateTrackingDto
    {
        public int ShipmentId { get; set; }
        public DateTime EstimatedDeliveryDate { get; set; }
        public string Status { get; set; } = "Pending";
    }
}