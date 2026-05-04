using Microsoft.AspNetCore.Mvc;
using SupplierService.DTOs;
using SupplierService.Services.Interfaces;

namespace SupplierService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PurchaseOrdersController : ControllerBase
    {
        private readonly ISupplierService _service;
        private readonly ILogger<PurchaseOrdersController> _logger;

        public PurchaseOrdersController(ISupplierService service, ILogger<PurchaseOrdersController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _service.GetAllPurchaseOrdersAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var purchaseOrder = await _service.GetPurchaseOrderByIdAsync(id);
            return purchaseOrder == null ? NotFound() : Ok(purchaseOrder);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderDto dto)
        {
            var purchaseOrder = await _service.CreatePurchaseOrderAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = purchaseOrder.Id }, purchaseOrder);
        }

      
        [HttpPost("{id}/confirm-shipment")]
        public async Task<IActionResult> ConfirmShipment(int id, [FromBody] ShipmentConfirmationDto dto)
        {
            try
            {
                var purchaseOrder = await _service.ConfirmShipmentAsync(id, dto);
                
                if (purchaseOrder == null)
                {
                    _logger.LogWarning("Purchase order with ID {PurchaseOrderId} not found", id);
                    return NotFound(new { message = $"Purchase order with ID {id} not found" });
                }
                
                _logger.LogInformation("Purchase order {PONumber} status updated to {Status} from warehouse", 
                    purchaseOrder.PONumber, purchaseOrder.Status);
                
                return Ok(purchaseOrder);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming shipment for purchase order {PurchaseOrderId}", id);
                return StatusCode(500, new { message = "Error updating purchase order", error = ex.Message });
            }
        }

        [HttpPost("receive")]
        public async Task<IActionResult> Receive([FromBody] ReceivePurchaseOrderDto dto)
        {
            var purchaseOrder = await _service.ReceivePurchaseOrderAsync(dto);
            return purchaseOrder == null ? NotFound() : Ok(purchaseOrder);
        }
    }
}