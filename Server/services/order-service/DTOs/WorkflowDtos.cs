namespace OrderService.DTOs
{
    public class WarehouseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Location { get; set; }
        public bool IsActive { get; set; }
    }

    public class InventoryCheckDto
    {
        public int ProductId { get; set; }
        public int WarehouseId { get; set; }
        public int AvailableQuantity { get; set; }
        public int ReservedQuantity { get; set; }
    }

    public class ShipmentResponseDto
    {
        public int Id { get; set; }
        public string TrackingNumber { get; set; } = string.Empty;
    }

   
    public class SelectWarehouseRequest
    {
        public string? CustomerAddress { get; set; }
    }

    public class DeliveryFailedRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class ProcessReturnRequest
    {
        public Dictionary<int, int> ReturnedItems { get; set; } = new();
    }
}