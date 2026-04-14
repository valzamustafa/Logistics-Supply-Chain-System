using Microsoft.AspNetCore.Mvc;
using TrackingService.DTOs;
using TrackingService.Services.Interfaces;

namespace TrackingService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrackingController : ControllerBase
    {
        private readonly ITrackingService _service;

        public TrackingController(ITrackingService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var trackings = await _service.GetAllAsync();
            return Ok(trackings);
        }

        [HttpGet("shipment/{shipmentId}")]
        public async Task<IActionResult> GetByShipmentId(int shipmentId)
        {
            var tracking = await _service.GetByShipmentIdAsync(shipmentId);
            return tracking == null ? NotFound() : Ok(tracking);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTrackingDto dto)
        {
            try
            {
                var tracking = await _service.CreateTrackingAsync(dto);
                return Ok(tracking);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("shipment/{shipmentId}/status")]
        public async Task<IActionResult> UpdateStatus(int shipmentId, [FromBody] UpdateTrackingStatusDto dto)
        {
            try
            {
                var tracking = await _service.UpdateStatusAsync(shipmentId, dto);
                return Ok(tracking);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPut("shipment/{shipmentId}/deliver")]
        public async Task<IActionResult> MarkAsDelivered(int shipmentId, [FromBody] MarkAsDeliveredDto dto)
        {
            try
            {
                var tracking = await _service.MarkAsDeliveredAsync(shipmentId, dto);
                return Ok(tracking);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}