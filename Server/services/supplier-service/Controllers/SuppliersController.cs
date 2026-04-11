using Microsoft.AspNetCore.Mvc;
using SupplierService.DTOs;
using SupplierService.Services.Interfaces;

namespace SupplierService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SuppliersController : ControllerBase
    {
        private readonly ISupplierService _service;

        public SuppliersController(ISupplierService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _service.GetAllSuppliersAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var supplier = await _service.GetSupplierByIdAsync(id);
            return supplier == null ? NotFound() : Ok(supplier);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSupplierDto dto)
        {
            var supplier = await _service.CreateSupplierAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, supplier);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateSupplierDto dto)
        {
            var supplier = await _service.UpdateSupplierAsync(id, dto);
            return Ok(supplier);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteSupplierAsync(id);
            return deleted ? NoContent() : NotFound();
        }

        [HttpGet("orders")]
        public async Task<IActionResult> GetAllOrders() => Ok(await _service.GetAllOrdersAsync());

        [HttpGet("orders/{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _service.GetOrderByIdAsync(id);
            return order == null ? NotFound() : Ok(order);
        }

        [HttpPost("orders")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateSupplierOrderDto dto)
        {
            var order = await _service.CreateOrderAsync(dto);
            return Ok(order);
        }
    }
}