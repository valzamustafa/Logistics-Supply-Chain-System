using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplierService.DTOs;
using SupplierService.Services.Interfaces;

namespace SupplierService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SuppliersController : ControllerBase
    {
        private readonly ISupplierService _service;

        public SuppliersController(ISupplierService service)
        {
            _service = service;
        }

        [Authorize(Roles = "Admin,Manager,WarehouseStaff,Warehouse,Supplier")]
        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _service.GetAllSuppliersAsync());

        [Authorize(Roles = "Admin,Manager,WarehouseStaff,Warehouse,Supplier")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var supplier = await _service.GetSupplierByIdAsync(id);
            return supplier == null ? NotFound() : Ok(supplier);
        }

        [Authorize(Roles = "Admin,Manager,WarehouseStaff,Warehouse,Supplier")]
        [HttpGet("{id}/products")]
        public async Task<IActionResult> GetSupplierProducts(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "Invalid supplier id." });
            }

            var products = await _service.GetSupplierProductsBySupplierIdAsync(id);
            return Ok(products);
        }

        [Authorize]
        [HttpGet("products/all")]
        public async Task<IActionResult> GetAllSupplierProducts()
        {
            var products = await _service.GetAllSupplierProductsAsync();
            return Ok(products);
        }

        [Authorize]
        [HttpGet("all-products")]
        public async Task<IActionResult> GetAllSupplierProductsAlternate()
        {
            var products = await _service.GetAllSupplierProductsAsync();
            return Ok(products);
        }

        [Authorize(Roles = "Admin,Manager,Supplier")]
        [HttpPost("{id}/products")]
        public async Task<IActionResult> AddSupplierProduct(int id, [FromBody] CreateSupplierProductDto dto)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "Invalid supplier id." });
            }

            try
            {
                var product = await _service.AddSupplierProductAsync(id, dto);
                return CreatedAtAction(nameof(GetSupplierProducts), new { id }, product);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin,Manager,Supplier")]
        [HttpGet("email/{email}")]
        public async Task<IActionResult> GetByEmail(string email)
        {
            var supplier = await _service.GetSupplierByEmailAsync(email);
            return supplier == null ? NotFound() : Ok(supplier);
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSupplierDto dto)
        {
            var supplier = await _service.CreateSupplierAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, supplier);
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateSupplierDto dto)
        {
            var supplier = await _service.UpdateSupplierAsync(id, dto);
            return Ok(supplier);
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteSupplierAsync(id);
            return deleted ? NoContent() : NotFound();
        }

        [Authorize(Roles = "Admin,Manager,WarehouseStaff,Warehouse,Supplier")]
        [HttpGet("orders")]
        public async Task<IActionResult> GetAllOrders() => Ok(await _service.GetAllOrdersAsync());

        [Authorize(Roles = "Admin,Manager,WarehouseStaff,Warehouse,Supplier")]
        [HttpGet("orders/{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _service.GetOrderByIdAsync(id);
            return order == null ? NotFound() : Ok(order);
        }

        [Authorize(Roles = "Admin,Manager,WarehouseStaff,Warehouse")]
        [HttpPost("orders")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateSupplierOrderDto dto)
        {
            var order = await _service.CreateOrderAsync(dto);
            return Ok(order);
        }

        [Authorize(Roles = "Supplier,Admin")]
        [HttpPut("orders/{id}/status")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
        {
            var order = await _service.UpdateSupplierOrderStatusAsync(id, dto.Status);
            return order == null ? NotFound() : Ok(order);
        }

        [Authorize(Roles = "Admin,Manager,WarehouseStaff,Warehouse")]
        [HttpPost("orders/{id}/payments")]
        public async Task<IActionResult> CreatePayment(int id, [FromBody] CreatePaymentDto dto)
        {
            try
            {
                dto.PurchaseOrderId = id;
                var payment = await _service.CreatePaymentAsync(dto);
                return CreatedAtAction(nameof(GetPaymentById), new { id = payment.Id }, payment);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin,Manager,Supplier,WarehouseStaff,Warehouse")]
        [HttpGet("orders/{id}/payments")]
        public async Task<IActionResult> GetPayments(int id)
        {
            var payments = await _service.GetPaymentsByPurchaseOrderAsync(id);
            return Ok(payments);
        }

        [Authorize(Roles = "Admin,Manager,Supplier,WarehouseStaff,Warehouse")]
        [HttpGet("orders/{id}/invoice-pdf")]
        public async Task<IActionResult> GetInvoicePdf(int id)
        {
            try
            {
                var pdfBytes = await _service.GenerateInvoicePdfAsync(id);
                return File(pdfBytes, "application/pdf", $"invoice-{id}.pdf");
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin,Manager,Supplier,WarehouseStaff,Warehouse")]
        [HttpGet("payments/{id}")]
        public async Task<IActionResult> GetPaymentById(int id)
        {
            var payment = await _service.GetPaymentByIdAsync(id);
            return payment == null ? NotFound() : Ok(payment);
        }

        [AllowAnonymous]
        [HttpPost("requests")]
        public async Task<IActionResult> RequestSupplier([FromBody] CreateSupplierRequestDto dto)
        {
            var request = await _service.RequestNewSupplierAsync(dto);
            return Ok(request);
        }

        [Authorize(Roles = "Admin,Manager,Supplier")]
        [HttpGet("requests/pending")]
        public async Task<IActionResult> GetPendingSupplierRequests()
        {
            try
            {
                string? email = null;
                if (User.IsInRole("Supplier"))
                {
                    email = User.FindFirst(ClaimTypes.Email)?.Value
                        ?? User.FindFirst("email")?.Value
                        ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;

                    if (string.IsNullOrEmpty(email))
                    {
                        return Unauthorized(new { message = "Email claim not found in token" });
                    }
                }

                var requests = await _service.GetPendingSupplierRequestsAsync(email);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPendingSupplierRequests: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = "Error retrieving pending requests", error = ex.Message });
            }
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpPost("invitations")]
        public async Task<IActionResult> InviteSupplier([FromBody] CreateSupplierInvitationDto dto)
        {
            var invitation = await _service.InviteSupplierAsync(dto);
            return Ok(invitation);
        }

        [AllowAnonymous]
        [HttpPost("invitations/register")]
        public async Task<IActionResult> RegisterWithInvitation([FromBody] SupplierRegistrationDto dto)
        {
            var supplier = await _service.RegisterWithInvitationAsync(dto);
            return supplier == null ? BadRequest("Invalid or expired invitation token") : CreatedAtAction(nameof(GetById), new { id = supplier.Id }, supplier);
        }

        [Authorize(Roles = "Admin,Manager,WarehouseStaff,Warehouse")]
        [HttpPost("emergency-purchases")]
        public async Task<IActionResult> CreateEmergencyPurchase([FromBody] CreateEmergencyPurchaseDto dto)
        {
            var emergency = await _service.CreateEmergencyPurchaseAsync(dto);
            return Ok(emergency);
        }

        [Authorize(Roles = "Admin,Manager,WarehouseStaff,Warehouse")]
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
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                var firstName = User.FindFirst(ClaimTypes.GivenName)?.Value;
                var lastName = User.FindFirst(ClaimTypes.Surname)?.Value;
                var displayName = !string.IsNullOrWhiteSpace(userName)
                    ? userName
                    : string.IsNullOrWhiteSpace(firstName) && string.IsNullOrWhiteSpace(lastName)
                        ? email
                        : $"{firstName} {lastName}".Trim();

                var supplier = await _service.EnsureSupplierProfileAsync(email, displayName, displayName);

                return Ok(new SupplierDashboardDto
                {
                    SupplierId = supplier.Id,
                    SupplierName = supplier.Name,
                    SupplierEmail = supplier.Email,
                    SupplierContactPerson = supplier.ContactPerson,
                    SupplierPhone = supplier.Phone,
                    WarehouseIds = new List<int>(),
                    Orders = new List<PurchaseOrderDto>()
                });
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