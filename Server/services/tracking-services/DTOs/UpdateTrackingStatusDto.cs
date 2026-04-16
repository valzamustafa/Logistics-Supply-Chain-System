namespace TrackingService.DTOs
{
    public class UpdateTrackingStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Location { get; set; }
    }
}