using Microsoft.AspNetCore.Mvc;
using InventoryService.DTOs;
using InventoryService.Services.Interfaces;

namespace InventoryService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;

        public InventoryController(IInventoryService inventoryService)
        {
            _inventoryService = inventoryService;
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
            return Ok(new { success = result });
        }

       
        [HttpPost("release")]
        public async Task<IActionResult> ReleaseStock([FromBody] StockOperationRequest request)
        {
            var result = await _inventoryService.ReleaseStockAsync(
                request.ProductId, request.WarehouseId, request.Quantity,
                request.ReferenceType, request.ReferenceId);
            return Ok(new { success = result });
        }

      
        [HttpPost("deduct")]
        public async Task<IActionResult> DeductStock([FromBody] StockDeductRequest request)
        {
            var result = await _inventoryService.DeductStockAsync(
                request.ProductId, request.WarehouseId, request.Quantity,
                request.ReferenceType, request.ReferenceId, request.Notes);
            return Ok(new { success = result });
        }


        [HttpPost("restore")]
        public async Task<IActionResult> RestoreStock([FromBody] StockDeductRequest request)
        {
            var result = await _inventoryService.RestoreStockAsync(
                request.ProductId, request.WarehouseId, request.Quantity,
                request.ReferenceType, request.ReferenceId, request.Notes);
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