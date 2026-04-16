  namespace WarehouseService.DTOs
{
  public class WarehouseStaffDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int WarehouseId { get; set; }
        public string? Position { get; set; }
        public DateTime? HireDate { get; set; }
    }
}
