using Microsoft.AspNetCore.Mvc;
using WarehouseService.DTOs;
using WarehouseService.Services.Interfaces;

namespace WarehouseService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WarehousesController : ControllerBase
    {
        private readonly IWarehouseService _warehouseService;

        public WarehousesController(IWarehouseService warehouseService)
        {
            _warehouseService = warehouseService;
        }

 
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var warehouses = await _warehouseService.GetAllWarehousesAsync();
            return Ok(warehouses);
        }

  
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var warehouse = await _warehouseService.GetWarehouseByIdAsync(id);
            if (warehouse == null)
                return NotFound(new { message = $"Warehouse {id} not found" });
            return Ok(warehouse);
        }

       
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateWarehouseDto dto)
        {
            try
            {
                var warehouse = await _warehouseService.CreateWarehouseAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = warehouse.Id }, warehouse);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateWarehouseDto dto)
        {
            try
            {
                var warehouse = await _warehouseService.UpdateWarehouseAsync(id, dto);
                return Ok(warehouse);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

       
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var result = await _warehouseService.DeleteWarehouseAsync(id);
                return result ? Ok(new { message = "Warehouse deleted" }) : NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

    
  
        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(int id, [FromBody] ToggleStatusRequest request)
        {
            try
            {
                var result = await _warehouseService.ToggleWarehouseStatusAsync(id, request.IsActive);
                return Ok(new { success = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

  
        [HttpGet("{id}/stats")]
        public async Task<IActionResult> GetStats(int id)
        {
            try
            {
                var stats = await _warehouseService.GetWarehouseStatsAsync(id);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }


        [HttpGet("{warehouseId}/inventory/{productId}")]
        public async Task<IActionResult> GetProductInventory(int warehouseId, int productId)
        {
            try
            {
                var stock = await _warehouseService.GetStockByWarehouseAsync(warehouseId);
                var productStock = stock.FirstOrDefault(s => s.ProductId == productId);
                
                if (productStock == null)
                    return NotFound(new { message = $"Product {productId} not found in warehouse {warehouseId}" });
                
                return Ok(new 
                { 
                    ProductId = productId, 
                    WarehouseId = warehouseId,
                    AvailableQuantity = productStock.Quantity,
                    ReservedQuantity = 0
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

       
        [HttpGet("{warehouseId}/check-availability")]
        public async Task<IActionResult> CheckAvailability(int warehouseId, [FromQuery] int productId, [FromQuery] int quantity)
        {
            try
            {
                var isAvailable = await _warehouseService.IsProductAvailableAsync(warehouseId, productId, quantity);
                return Ok(new { isAvailable });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpGet("stock")]
        public async Task<IActionResult> GetAllStock()
        {
            var stock = await _warehouseService.GetAllStockAsync();
            return Ok(stock);
        }

   
        [HttpGet("stock/{id}")]
        public async Task<IActionResult> GetStockById(int id)
        {
            var stock = await _warehouseService.GetStockByIdAsync(id);
            if (stock == null)
                return NotFound(new { message = $"Stock with ID {id} not found" });
            return Ok(stock);
        }

    
        [HttpGet("{warehouseId}/stock")]
        public async Task<IActionResult> GetStockByWarehouse(int warehouseId)
        {
            var stock = await _warehouseService.GetStockByWarehouseAsync(warehouseId);
            return Ok(stock);
        }

 
        [HttpGet("product/{productId}/stock")]
        public async Task<IActionResult> GetStockByProduct(int productId)
        {
            var stock = await _warehouseService.GetStockByProductAsync(productId);
            return Ok(stock);
        }


        [HttpGet("{warehouseId}/product/{productId}")]
        public async Task<IActionResult> GetStockByWarehouseAndProduct(int warehouseId, int productId)
        {
            var stock = await _warehouseService.GetStockByWarehouseAsync(warehouseId);
            var productStock = stock.FirstOrDefault(s => s.ProductId == productId);
            if (productStock == null)
                return NotFound(new { message = $"Product {productId} not found in warehouse {warehouseId}" });
            return Ok(productStock);
        }


        [HttpPost("{warehouseId}/assign")]
        public async Task<IActionResult> AssignProductToWarehouse(int warehouseId, [FromBody] AssignProductToWarehouseDto dto)
        {
            try
            {
                var result = await _warehouseService.AssignProductToWarehouseAsync(warehouseId, dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }


        [HttpPut("{warehouseId}/product/{productId}/stock")]
        public async Task<IActionResult> UpdateStock(int warehouseId, int productId, [FromBody] UpdateStockDto dto)
        {
            try
            {
                var result = await _warehouseService.UpdateStockAsync(warehouseId, productId, dto);
                return Ok(new { message = "Stock updated successfully", data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

 
        [HttpPost("transfer")]
        public async Task<IActionResult> TransferStock([FromBody] TransferStockDto dto)
        {
            try
            {
                var result = await _warehouseService.TransferStockAsync(dto);
                return Ok(new { message = "Stock transferred successfully", data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }


        [HttpGet("{warehouseId}/product/{productId}/movements")]
        public async Task<IActionResult> GetStockMovements(int warehouseId, int productId, [FromQuery] int? limit = null)
        {
            try
            {
                var movements = await _warehouseService.GetStockMovementsAsync(warehouseId, productId, limit);
                return Ok(movements);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }


        [HttpGet("low-stock")]
        public async Task<IActionResult> GetLowStockAlerts([FromQuery] int? warehouseId = null)
        {
            try
            {
                var alerts = await _warehouseService.GetLowStockAlertsAsync(warehouseId);
                return Ok(alerts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

  
        [HttpDelete("{warehouseId}/product/{productId}")]
        public async Task<IActionResult> RemoveProductFromWarehouse(int warehouseId, int productId)
        {
            try
            {
                var result = await _warehouseService.RemoveProductFromWarehouseAsync(warehouseId, productId);
                return result ? Ok(new { message = "Product removed from warehouse" }) : NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

       
        [HttpPost("warehouse/{warehouseId}/bulk-assign")]
        public async Task<IActionResult> BulkAssignProducts(int warehouseId, [FromBody] List<AssignProductToWarehouseDto> products)
        {
            var results = new List<object>();
            var errors = new List<object>();

            foreach (var dto in products)
            {
                try
                {
                    var result = await _warehouseService.AssignProductToWarehouseAsync(warehouseId, dto);
                    results.Add(new { productId = dto.ProductId, success = true, data = result });
                }
                catch (InvalidOperationException ex)
                {
                    errors.Add(new { productId = dto.ProductId, success = false, message = ex.Message });
                }
                catch (Exception ex)
                {
                    errors.Add(new { productId = dto.ProductId, success = false, message = ex.Message });
                }
            }

            return Ok(new { 
                total = products.Count, 
                succeeded = results.Count, 
                failed = errors.Count,
                results,
                errors
            });
        }

    
        [HttpGet("summary")]
        public async Task<IActionResult> GetStockSummary()
        {
            try
            {
                var allStock = await _warehouseService.GetAllStockAsync();
                var lowStock = allStock.Where(s => s.IsLowStock).ToList();
                var outOfStock = allStock.Where(s => s.IsOutOfStock).ToList();
                var overstock = allStock.Where(s => s.IsOverstock).ToList();

                var summary = new
                {
                    totalProducts = allStock.Count(),
                    totalQuantity = allStock.Sum(s => s.Quantity),
                    lowStockCount = lowStock.Count(),
                    outOfStockCount = outOfStock.Count(),
                    overstockCount = overstock.Count(),
                    warehouses = allStock.GroupBy(s => s.WarehouseId).Select(g => new
                    {
                        warehouseId = g.Key,
                        warehouseName = g.First().WarehouseName,
                        productCount = g.Count(),
                        totalQuantity = g.Sum(s => s.Quantity)
                    })
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

   
        [HttpGet("value-report")]
        public async Task<IActionResult> GetStockValueReport()
        {
            try
            {
                var allStock = await _warehouseService.GetAllStockAsync();
                
                var report = new
                {
                    generatedAt = DateTime.UtcNow,
                    totalStockItems = allStock.Count(),
                    totalQuantity = allStock.Sum(s => s.Quantity),
                    warehouses = allStock.GroupBy(s => s.WarehouseId).Select(g => new
                    {
                        warehouseId = g.Key,
                        warehouseName = g.First().WarehouseName,
                        productCount = g.Count(),
                        totalQuantity = g.Sum(s => s.Quantity),
                        products = g.Select(s => new
                        {
                            s.ProductId,
                            s.ProductName,
                            s.ProductSku,
                            s.Quantity,
                            s.MinimumStockLevel,
                            s.MaximumStockLevel,
                            status = s.IsOutOfStock ? "Out of Stock" : (s.IsLowStock ? "Low Stock" : (s.IsOverstock ? "Overstock" : "OK"))
                        })
                    })
                };

                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }
    }

    public class ToggleStatusRequest
    {
        public bool IsActive { get; set; }
    }
}