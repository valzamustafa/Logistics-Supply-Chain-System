namespace ShipmentService.DTOs
{
    public class ShipmentDto
    {
        public int Id { get; set; }
        public string TrackingNumber { get; set; } = string.Empty;
        public int OrderId { get; set; }
        public int? DriverId { get; set; }
        public string? DriverName { get; set; }
        public int? VehicleId { get; set; }
        public string? VehiclePlate { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime EstimatedDeliveryDate { get; set; }
        public DateTime? ActualDeliveryDate { get; set; }
        public string? ShippingAddress { get; set; }
        public List<ShipmentItemDto> Items { get; set; } = new();
    }
}