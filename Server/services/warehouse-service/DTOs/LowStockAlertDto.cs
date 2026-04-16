namespace WarehouseService.DTOs
{
    public class LowStockAlertDto
    {
        public int WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductSku { get; set; } = string.Empty;
        public int CurrentQuantity { get; set; }
        public int MinimumLevel { get; set; }
        public int Deficit { get; set; }  
    }
}
