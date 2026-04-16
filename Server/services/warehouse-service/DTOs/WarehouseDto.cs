namespace WarehouseService.DTOs
{
    public class WarehouseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Location { get; set; }
        public string? Phone { get; set; }
        public bool IsActive { get; set; }
        public List<WarehouseZoneDto> Zones { get; set; } = new();
        public List<WarehouseStaffDto> Staff { get; set; } = new();
    }

}
