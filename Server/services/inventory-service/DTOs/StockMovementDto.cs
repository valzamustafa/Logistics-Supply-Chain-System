  namespace InventoryService.DTOs
{
  public class StockMovementDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? ReferenceType { get; set; }
        public int? ReferenceId { get; set; }
        public string? Notes { get; set; }
        public DateTime MovementDate { get; set; }
    }
}
