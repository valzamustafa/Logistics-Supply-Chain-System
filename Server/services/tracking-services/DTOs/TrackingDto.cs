namespace TrackingService.DTOs
{
    public class TrackingDto
    {
        public int Id { get; set; }
        public int ShipmentId { get; set; }
        public string CurrentStatus { get; set; } = string.Empty;
        public string? CurrentLocation { get; set; }
        public DateTime? LastUpdateTime { get; set; }
        public DateTime EstimatedDeliveryDate { get; set; }
        public DateTime? ActualDeliveryDate { get; set; }
    }

}