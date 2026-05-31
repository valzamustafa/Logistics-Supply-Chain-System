namespace WarehouseService.DTOs
{
    public class UpdateWarehouseZoneDto
    {
        public string ZoneName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Capacity { get; set; }
    }
}