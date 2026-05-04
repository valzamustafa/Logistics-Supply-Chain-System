namespace WarehouseService.DTOs
{
    public class WarehouseStatsDto
    {
        public int TotalProducts { get; set; }
        public int TotalQuantity { get; set; }
        public int LowStockCount { get; set; }
        public int OutOfStockCount { get; set; }
        public int ZonesCount { get; set; }
        public int StaffCount { get; set; }
    }
}