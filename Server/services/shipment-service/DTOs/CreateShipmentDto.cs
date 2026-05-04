namespace ShipmentService.DTOs;

public class CreateShipmentDto
{
    public int OrderId { get; set; }
    public int? WarehouseId { get; set; }
    public int? DriverId { get; set; }
    public int? VehicleId { get; set; }
    public DateTime EstimatedDeliveryDate { get; set; }
    public string? ShippingAddress { get; set; }
    public List<CreateShipmentItemDto> Items { get; set; } = new();
}

public class CreateShipmentItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public class UpdateShipmentStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? Location { get; set; }
     public string? Notes { get; set; }
}


public class CompleteDeliveryDto
{
    public string? Proof { get; set; }
    public string? Signature { get; set; }
}

public class AssignDriverDto
{
    public int DriverId { get; set; }
}