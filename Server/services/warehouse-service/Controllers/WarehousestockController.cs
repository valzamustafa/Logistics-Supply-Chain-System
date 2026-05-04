// WarehouseService/Controllers/WarehousestockController.cs
using Microsoft.AspNetCore.Mvc;
using WarehouseService.DTOs;
using WarehouseService.Services.Interfaces;

namespace WarehouseService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WarehousestockController : ControllerBase
    {
        private readonly IWarehouseService _warehouseService;

        public WarehousestockController(IWarehouseService warehouseService)
        {
            _warehouseService = warehouseService;
        }


        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var stock = await _warehouseService.GetAllStockAsync();
            return Ok(stock);
        }

    
        [HttpGet("warehouse/{warehouseId}")]
        public async Task<IActionResult> GetByWarehouse(int warehouseId)
        {
            var stock = await _warehouseService.GetStockByWarehouseAsync(warehouseId);
            return Ok(stock);
        }

       
        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetByProduct(int productId)
        {
            var stock = await _warehouseService.GetStockByProductAsync(productId);
            return Ok(stock);
        }

  
        [HttpGet("warehouse/{warehouseId}/product/{productId}")]
        public async Task<IActionResult> GetByWarehouseAndProduct(int warehouseId, int productId)
        {
            var allStock = await _warehouseService.GetStockByWarehouseAsync(warehouseId);
            var stock = allStock.FirstOrDefault(s => s.ProductId == productId);
            if (stock == null)
                return NotFound(new { message = "Stock not found" });
            return Ok(stock);
        }

    
        [HttpPost("warehouse/{warehouseId}/assign")]
        public async Task<IActionResult> AssignProductToWarehouse(int warehouseId, [FromBody] AssignProductToWarehouseDto dto)
        {
            try
            {
                var stock = await _warehouseService.AssignProductToWarehouseAsync(warehouseId, dto);
                return CreatedAtAction(nameof(GetByWarehouseAndProduct), new { warehouseId, productId = dto.ProductId }, stock);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

      
        [HttpGet("warehouse/{warehouseId}/unassigned-products")]
        public async Task<IActionResult> GetUnassignedProducts(int warehouseId)
        {
         
            return Ok(new List<object>());
        }


        [HttpPut("warehouse/{warehouseId}/product/{productId}/stock")]
        public async Task<IActionResult> UpdateStock(int warehouseId, int productId, [FromBody] UpdateStockDto dto)
        {
            try
            {
                var stock = await _warehouseService.UpdateStockAsync(warehouseId, productId, dto);
                return Ok(stock);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

  
        [HttpPost("transfer")]
        public async Task<IActionResult> TransferStock([FromBody] TransferStockDto dto)
        {
            try
            {
                var stock = await _warehouseService.TransferStockAsync(dto);
                return Ok(stock);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

 
        [HttpGet("warehouse/{warehouseId}/product/{productId}/movements")]
        public async Task<IActionResult> GetMovements(int warehouseId, int productId, [FromQuery] int? limit = null)
        {
            var movements = await _warehouseService.GetStockMovementsAsync(warehouseId, productId, limit);
            return Ok(movements);
        }


        [HttpGet("low-stock")]
        public async Task<IActionResult> GetLowStockAlerts([FromQuery] int? warehouseId = null)
        {
            var alerts = await _warehouseService.GetLowStockAlertsAsync(warehouseId);
            return Ok(alerts);
        }


        [HttpGet("warehouse/{warehouseId}/product/{productId}/availability")]
        public async Task<IActionResult> CheckAvailability(int warehouseId, int productId, [FromQuery] int quantity)
        {
            var isAvailable = await _warehouseService.IsProductAvailableAsync(warehouseId, productId, quantity);
            return Ok(new { isAvailable });
        }

     
        [HttpDelete("warehouse/{warehouseId}/product/{productId}")]
        public async Task<IActionResult> RemoveProduct(int warehouseId, int productId)
        {
            var result = await _warehouseService.RemoveProductFromWarehouseAsync(warehouseId, productId);
            if (!result)
                return NotFound(new { message = "Failed to remove product" });
            return NoContent();
        }
    }
}