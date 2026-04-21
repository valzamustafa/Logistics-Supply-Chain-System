   namespace WarehouseService.DTOs
{
    public class UpdateWarehouseDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Location { get; set; }
        public string? Phone { get; set; }
        public bool IsActive { get; set; }
    }
}
