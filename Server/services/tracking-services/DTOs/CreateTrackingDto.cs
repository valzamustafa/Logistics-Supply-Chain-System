namespace TrackingService.DTOs
{
    public class CreateTrackingDto
    {
        public int ShipmentId { get; set; }
        public DateTime EstimatedDeliveryDate { get; set; }
    }
}



MarkAsDeliveredDto.cs-emri i file
namespace TrackingService.DTOs
{
    public class MarkAsDeliveredDto
    {
        public DateTime ActualDeliveryDate { get; set; }
        public string? Location { get; set; }
    }
}