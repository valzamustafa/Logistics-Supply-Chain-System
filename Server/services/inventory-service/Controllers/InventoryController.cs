using Microsoft.AspNetCore.Mvc;
using InventoryService.DTOs;
using InventoryService.Services.Interfaces;
using BuildingBlocks;

namespace InventoryService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;
        private readonly INotificationClient _notificationClient;

        public InventoryController(IInventoryService inventoryService, INotificationClient notificationClient)
        {
            _inventoryService = inventoryService;
            _notificationClient = notificationClient;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var inventory = await _inventoryService.GetAllInventoryAsync();
            return Ok(inventory);
        }

        [HttpGet("{productId}/{warehouseId}")]
        public async Task<IActionResult> Get(int productId, int warehouseId)
        {
            var inventory = await _inventoryService.GetInventoryAsync(productId, warehouseId);
            if (inventory == null)
                return NotFound();
            return Ok(inventory);
        }

        [HttpGet("warehouse/{warehouseId}")]
        public async Task<IActionResult> GetByWarehouse(int warehouseId)
        {
            var inventory = await _inventoryService.GetInventoryByWarehouseAsync(warehouseId);
            return Ok(inventory);
        }

        [HttpPost("stock")]
        public async Task<IActionResult> UpdateStock([FromBody] UpdateStockDto request)
        {
            var result = await _inventoryService.UpdateStockAsync(request);
            
           
            await _notificationClient.SendNotificationToRoleAsync(
                "Warehouse",
                "StockUpdated",
                "Stock Updated",
                $"Stock updated for Product {request.ProductId} in Warehouse {request.WarehouseId}. New quantity: {request.Quantity} units.",
                $"/inventory?productId={request.ProductId}&warehouseId={request.WarehouseId}"
            );
            
            return Ok(result);
        }

        [HttpGet("low-stock-alerts")]
        public async Task<IActionResult> GetLowStockAlerts()
        {
            var alerts = await _inventoryService.GetLowStockAlertsAsync();
            return Ok(alerts);
        }

        [HttpGet("availability")]
        public async Task<IActionResult> CheckAvailability([FromQuery] int productId, [FromQuery] int warehouseId, [FromQuery] int quantity)
        {
            var isAvailable = await _inventoryService.CheckStockAvailabilityAsync(productId, warehouseId, quantity);
            return Ok(new { isAvailable });
        }

     
        [HttpPost("reserve")]
        public async Task<IActionResult> ReserveStock([FromBody] StockOperationRequest request)
        {
            var result = await _inventoryService.ReserveStockAsync(
                request.ProductId, request.WarehouseId, request.Quantity, 
                request.ReferenceType, request.ReferenceId);
            
            if (result)
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Warehouse",
                    "StockReserved",
                    "Stock Reserved",
                    $"{request.Quantity} units of Product {request.ProductId} have been reserved in Warehouse {request.WarehouseId} for {request.ReferenceType} #{request.ReferenceId}.",
                    $"/inventory?productId={request.ProductId}&warehouseId={request.WarehouseId}"
                );
            }
            
            return Ok(new { success = result });
        }

     
        [HttpPost("release")]
        public async Task<IActionResult> ReleaseStock([FromBody] StockOperationRequest request)
        {
            var result = await _inventoryService.ReleaseStockAsync(
                request.ProductId, request.WarehouseId, request.Quantity,
                request.ReferenceType, request.ReferenceId);
            
            if (result)
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Warehouse",
                    "StockReleased",
                    "Stock Released",
                    $"{request.Quantity} units of Product {request.ProductId} have been released from reservation in Warehouse {request.WarehouseId}.",
                    $"/inventory?productId={request.ProductId}&warehouseId={request.WarehouseId}"
                );
            }
            
            return Ok(new { success = result });
        }

       
        [HttpPost("deduct")]
        public async Task<IActionResult> DeductStock([FromBody] StockDeductRequest request)
        {
            var result = await _inventoryService.DeductStockAsync(
                request.ProductId, request.WarehouseId, request.Quantity,
                request.ReferenceType, request.ReferenceId, request.Notes);
            
            if (result)
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Warehouse",
                    "StockDeducted",
                    "Stock Deducted",
                    $"{request.Quantity} units deducted from Product {request.ProductId} in Warehouse {request.WarehouseId}. Reason: {request.Notes ?? request.ReferenceType}",
                    $"/inventory?productId={request.ProductId}&warehouseId={request.WarehouseId}"
                );
            }
            
            return Ok(new { success = result });
        }

      
        [HttpPost("restore")]
        public async Task<IActionResult> RestoreStock([FromBody] StockDeductRequest request)
        {
            var result = await _inventoryService.RestoreStockAsync(
                request.ProductId, request.WarehouseId, request.Quantity,
                request.ReferenceType, request.ReferenceId, request.Notes);
            
            if (result)
            {
                await _notificationClient.SendNotificationToRoleAsync(
                    "Warehouse",
                    "StockRestored",
                    "Stock Restored",
                    $"{request.Quantity} units restored to Product {request.ProductId} in Warehouse {request.WarehouseId}. Reason: {request.Notes ?? request.ReferenceType}",
                    $"/inventory?productId={request.ProductId}&warehouseId={request.WarehouseId}"
                );
            }
            
            return Ok(new { success = result });
        }
    }


    public class StockOperationRequest
    {
        public int ProductId { get; set; }
        public int WarehouseId { get; set; }
        public int Quantity { get; set; }
        public string ReferenceType { get; set; } = string.Empty;
        public int ReferenceId { get; set; }
    }

    public class StockDeductRequest : StockOperationRequest
    {
        public string? Notes { get; set; }
    }
}