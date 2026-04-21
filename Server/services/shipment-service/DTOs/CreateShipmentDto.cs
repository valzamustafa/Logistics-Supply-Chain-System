namespace ShipmentService.DTOs;

public class CreateShipmentDto
{
    public int OrderId { get; set; }
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



C:\Users\Admin\Logistics-Supply-Chain-System\Server\services\shipment-service\DTOs


ReorderShipmentDto.cs-emri

namespace ShipmentService.DTOs;

public class ReorderShipmentDto
{
    public int ShipmentId { get; set; }
    public int NewPriority { get; set; } // 1=Low, 2=Medium, 3=High
}