namespace WarehouseService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WarehouseStockController : ControllerBase
    {
        private readonly IWarehouseService _warehouseService;

        public WarehouseStockController(IWarehouseService warehouseService)
        {
            _warehouseService = warehouseService;
        }

      
        [HttpGet]
        public async Task<IActionResult> GetAllStock()
        {
            var stock = await _warehouseService.GetAllStockAsync();
            return Ok(stock);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetStockById(int id)
        {
            var stock = await _warehouseService.GetStockByIdAsync(id);
            if (stock == null)
                return NotFound(new { message = $"Stock with ID {id} not found" });
            return Ok(stock);
        }

        
        [HttpGet("warehouse/{warehouseId}")]
        public async Task<IActionResult> GetStockByWarehouse(int warehouseId)
        {
            var stock = await _warehouseService.GetStockByWarehouseAsync(warehouseId);
            return Ok(stock);
        }

      
        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetStockByProduct(int productId)
        {
            var stock = await _warehouseService.GetStockByProductAsync(productId);
            return Ok(stock);
        }

     
        [HttpGet("warehouse/{warehouseId}/product/{productId}")]
        public async Task<IActionResult> GetStockByWarehouseAndProduct(int warehouseId, int productId)
        {
            var stock = await _warehouseService.GetStockByWarehouseAsync(warehouseId);
            var productStock = stock.FirstOrDefault(s => s.ProductId == productId);
            if (productStock == null)
                return NotFound(new { message = $"Product {productId} not found in warehouse {warehouseId}" });
            return Ok(productStock);
        }

      
        [HttpPost("warehouse/{warehouseId}/assign")]
        public async Task<IActionResult> AssignProductToWarehouse(int warehouseId, [FromBody] AssignProductToWarehouseDto dto)
        {
            try
            {
                var result = await _warehouseService.AssignProductToWarehouseAsync(warehouseId, dto);
                return Ok(new { message = "Product assigned successfully", data = result });
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

  
        [HttpPut("warehouse/{warehouseId}/product/{productId}/stock")]
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

   
        [HttpGet("warehouse/{warehouseId}/product/{productId}/movements")]
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


        [HttpGet("warehouse/{warehouseId}/product/{productId}/availability")]
        public async Task<IActionResult> CheckAvailability(int warehouseId, int productId, [FromQuery] int quantity)
        {
            try
            {
                var isAvailable = await _warehouseService.IsProductAvailableAsync(warehouseId, productId, quantity);
                return Ok(new 
                { 
                    warehouseId, 
                    productId, 
                    requestedQuantity = quantity, 
                    isAvailable,
                    message = isAvailable ? "Product is available" : "Insufficient stock"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }


        [HttpDelete("warehouse/{warehouseId}/product/{productId}")]
        public async Task<IActionResult> RemoveProductFromWarehouse(int warehouseId, int productId)
        {
            try
            {
                var removed = await _warehouseService.RemoveProductFromWarehouseAsync(warehouseId, productId);
                if (!removed)
                    return NotFound(new { message = $"Product {productId} not found in warehouse {warehouseId}" });
                
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
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
        public async Task<IActionResult> GetAllWarehouses()
        {
            var warehouses = await _warehouseService.GetAllWarehousesAsync();
            return Ok(warehouses);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetWarehouseById(int id)
        {
            var warehouse = await _warehouseService.GetWarehouseByIdAsync(id);
            if (warehouse == null)
                return NotFound(new { message = $"Warehouse with ID {id} not found" });
            return Ok(warehouse);
        }

        [HttpPost]
        public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseDto dto)
        {
            try
            {
                var warehouse = await _warehouseService.CreateWarehouseAsync(dto);
                return CreatedAtAction(nameof(GetWarehouseById), new { id = warehouse.Id }, warehouse);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to create warehouse", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateWarehouse(int id, [FromBody] UpdateWarehouseDto dto)
        {
            try
            {
                var updated = await _warehouseService.UpdateWarehouseAsync(id, dto);
                return Ok(updated);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Warehouse with ID {id} not found" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to update warehouse", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWarehouse(int id)
        {
            var deleted = await _warehouseService.DeleteWarehouseAsync(id);
            if (!deleted)
                return NotFound(new { message = $"Warehouse with ID {id} not found" });
            return NoContent();
        }

        [HttpGet("{warehouseId}/zones")]
        public async Task<IActionResult> GetZonesByWarehouse(int warehouseId)
        {
            var zones = await _warehouseService.GetZonesByWarehouseAsync(warehouseId);
            return Ok(zones);
        }

        [HttpPost("zones")]
        public async Task<IActionResult> CreateZone([FromBody] CreateWarehouseZoneDto dto)
        {
            try
            {
                var zone = await _warehouseService.CreateZoneAsync(dto);
                return CreatedAtAction(nameof(GetZonesByWarehouse), new { warehouseId = zone.WarehouseId }, zone);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to create zone", error = ex.Message });
            }
        }

        [HttpDelete("zones/{id}")]
        public async Task<IActionResult> DeleteZone(int id)
        {
            var deleted = await _warehouseService.DeleteZoneAsync(id);
            if (!deleted)
                return NotFound(new { message = $"Zone with ID {id} not found" });
            return NoContent();
        }

        [HttpGet("{warehouseId}/staff")]
        public async Task<IActionResult> GetStaffByWarehouse(int warehouseId)
        {
            var staff = await _warehouseService.GetStaffByWarehouseAsync(warehouseId);
            return Ok(staff);
        }

        [HttpPost("{warehouseId}/staff")]
        public async Task<IActionResult> AssignStaff(int warehouseId, [FromBody] AssignStaffDto dto)
        {
            try
            {
                var staff = await _warehouseService.AssignStaffAsync(warehouseId, dto);
                return CreatedAtAction(nameof(GetStaffByWarehouse), new { warehouseId }, staff);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to assign staff", error = ex.Message });
            }
        }

        [HttpDelete("staff/{id}")]
        public async Task<IActionResult> RemoveStaff(int id)
        {
            var deleted = await _warehouseService.RemoveStaffAsync(id);
            if (!deleted)
                return NotFound(new { message = $"Staff member with ID {id} not found" });
            return NoContent();
        }
    }
}