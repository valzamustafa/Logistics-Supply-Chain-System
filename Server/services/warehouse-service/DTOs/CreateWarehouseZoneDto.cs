    namespace WarehouseService.DTOs
{
    public class CreateWarehouseZoneDto
    {
        public int WarehouseId { get; set; }
        public string ZoneName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Capacity { get; set; }
    }
}