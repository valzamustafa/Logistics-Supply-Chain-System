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

        [HttpPost("stock")]
        public async Task<IActionResult> UpdateStock([FromBody] UpdateStockDto request)
        {
            var result = await _inventoryService.UpdateStockAsync(request);
            return Ok(result);
        }
    }
}