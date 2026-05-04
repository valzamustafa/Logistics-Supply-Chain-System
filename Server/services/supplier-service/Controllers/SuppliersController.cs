using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
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

        [HttpGet("email/{email}")]
        public async Task<IActionResult> GetByEmail(string email)
        {
            var supplier = await _service.GetSupplierByEmailAsync(email);
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

        //[Authorize(Roles = "Supplier,Admin")]
        [HttpPut("orders/{id}/status")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
        {
            var order = await _service.UpdateSupplierOrderStatusAsync(id, dto.Status);
            return order == null ? NotFound() : Ok(order);
        }

        [HttpPost("requests")]
        public async Task<IActionResult> RequestSupplier([FromBody] CreateSupplierRequestDto dto)
        {
            var request = await _service.RequestNewSupplierAsync(dto);
            return Ok(request);
        }

        [HttpGet("requests/pending")]
        public async Task<IActionResult> GetPendingSupplierRequests()
        {
            try
            {
                var requests = await _service.GetPendingSupplierRequestsAsync();
                return Ok(requests);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPendingSupplierRequests: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = "Error retrieving pending requests", error = ex.Message });
            }
        }

        [HttpPost("invitations")]
        public async Task<IActionResult> InviteSupplier([FromBody] CreateSupplierInvitationDto dto)
        {
            var invitation = await _service.InviteSupplierAsync(dto);
            return Ok(invitation);
        }

        [HttpPost("invitations/register")]
        public async Task<IActionResult> RegisterWithInvitation([FromBody] SupplierRegistrationDto dto)
        {
            var supplier = await _service.RegisterWithInvitationAsync(dto);
            return supplier == null ? BadRequest("Invalid or expired invitation token") : CreatedAtAction(nameof(GetById), new { id = supplier.Id }, supplier);
        }

        [HttpPost("emergency-purchases")]
        public async Task<IActionResult> CreateEmergencyPurchase([FromBody] CreateEmergencyPurchaseDto dto)
        {
            var emergency = await _service.CreateEmergencyPurchaseAsync(dto);
            return Ok(emergency);
        }

        [HttpPut("emergency-purchases/{id}/convert")]
        public async Task<IActionResult> ConvertEmergencyPurchase(int id, [FromBody] ConvertEmergencyPurchaseDto dto)
        {
            var emergency = await _service.ConvertEmergencyPurchaseAsync(id, dto);
            return Ok(emergency);
        }

        [Authorize(Roles = "Supplier,Admin")]
        [HttpGet("dashboard/me")]
        public async Task<IActionResult> GetMyDashboard()
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            
            if (string.IsNullOrEmpty(email))
            {
                email = User.FindFirst("email")?.Value;
            }
            
            if (string.IsNullOrEmpty(email))
            {
                email = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;
            }
            
            if (string.IsNullOrEmpty(email))
            {
                return Unauthorized(new { message = "Email claim not found in token" });
            }

            var dashboard = await _service.GetSupplierDashboardAsync(email);
            
            if (dashboard == null)
            {
                return NotFound(new { message = $"No supplier profile found for email: {email}" });
            }
            
            return Ok(dashboard);
        }

        [Authorize]
        [HttpGet("debug/claims")]
        public IActionResult GetClaims()
        {
            var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
            return Ok(claims);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("assign-to-warehouse")]
        public async Task<IActionResult> AssignSupplierToWarehouse([FromBody] AssignSupplierToWarehouseDto dto)
        {
            var supplier = await _service.AssignSupplierToWarehouseAsync(dto.SupplierId, dto.WarehouseId);
            return supplier == null ? NotFound() : Ok(supplier);
        }
    }
}