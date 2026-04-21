namespace WarehouseService.DTOs
{
    public class AssignProductToWarehouseDto
    {
        public int ProductId { get; set; }
        public int InitialQuantity { get; set; } = 0;
        public int MinimumStockLevel { get; set; } = 5;
        public int MaximumStockLevel { get; set; } = 1000;
        public string? ShelfLocation { get; set; }
    }
}
