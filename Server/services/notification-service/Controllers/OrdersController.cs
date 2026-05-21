using Microsoft.AspNetCore.Mvc;
using OrderService.DTOs;
using OrderService.Services.Interfaces;
using System.Net.Http.Headers;
using System.Text.Json;

namespace OrderService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public OrdersController(IOrderService orderService, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _orderService = orderService;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var orders = await _orderService.GetAllOrdersAsync();
            return Ok(orders);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _orderService.GetOrderByIdAsync(id);
            if (order == null)
                return NotFound(new { message = $"Order with ID {id} not found" });
            return Ok(order);
        }

        [HttpGet("{id}/invoice")]
        public async Task<IActionResult> GenerateInvoice(int id)
        {
            try
            {
                var order = await _orderService.GetOrderByIdAsync(id);
                if (order == null)
                    return NotFound(new { message = $"Order with ID {id} not found" });

                var pdfBytes = await _orderService.GenerateInvoicePdfAsync(order);
                
                return File(
                    pdfBytes, 
                    "application/pdf", 
                    $"Invoice-{order.OrderNumber}.pdf"
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error generating invoice: {ex.Message}" });
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(int userId)
        {
            var orders = await _orderService.GetOrdersByUserAsync(userId);
            return Ok(orders);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderRequestDto request)
        {
            try
            {
                var order = await _orderService.CreateOrderAsync(request);
                return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("payment-intent")]
        public async Task<IActionResult> CreatePaymentIntent([FromBody] CreatePaymentIntentDto request)
        {
            try
            {
                var stripeSecretKey = _configuration["Stripe:SecretKey"];
                if (string.IsNullOrWhiteSpace(stripeSecretKey))
                {
                    return BadRequest(new { message = "Stripe secret key is not configured." });
                }

                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", stripeSecretKey);
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                var amountInCents = (long)Math.Round(request.Amount * 100);
                var formData = new Dictionary<string, string>
                {
                    ["amount"] = amountInCents.ToString(),
                    ["currency"] = request.Currency ?? "eur",
                    ["payment_method_types[]"] = "card"
                };

                var response = await client.PostAsync("https://api.stripe.com/v1/payment_intents", new FormUrlEncodedContent(formData));
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, new { message = content });
                }

                using var document = JsonDocument.Parse(content);
                var clientSecret = document.RootElement.GetProperty("client_secret").GetString();

                return Ok(new { clientSecret });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto request)
        {
            try
            {
                var order = await _orderService.UpdateOrderStatusAsync(id, request.Status);
                return Ok(order);
            }
            catch (InvalidOperationException)
            {
                return NotFound(new { message = $"Order with ID {id} not found" });
            }
        }

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            var cancelled = await _orderService.CancelOrderAsync(id);
            if (!cancelled)
                return BadRequest(new { message = "Order cannot be cancelled" });
            return Ok(new { message = "Order cancelled successfully" });
        }

       
        [HttpPost("{id}/select-warehouse")]
        public async Task<IActionResult> SelectWarehouse(int id, [FromBody] SelectWarehouseRequest? request)
        {
            try
            {
                var warehouseId = await _orderService.SelectOptimalWarehouseAsync(id, request?.CustomerAddress);
                var order = await _orderService.AssignWarehouseAsync(id, warehouseId);
                return Ok(new { warehouseId, order });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}/assign-warehouse/{warehouseId}")]
        public async Task<IActionResult> AssignWarehouse(int id, int warehouseId)
        {
            try
            {
                var order = await _orderService.AssignWarehouseAsync(id, warehouseId);
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

      
        [HttpGet("{id}/validate-inventory")]
        public async Task<IActionResult> ValidateInventory(int id)
        {
            try
            {
                var isValid = await _orderService.ValidateInventoryAsync(id);
                return Ok(new { valid = isValid });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/reserve-inventory")]
        public async Task<IActionResult> ReserveInventory(int id)
        {
            try
            {
                var reserved = await _orderService.ReserveInventoryAsync(id);
                return Ok(new { success = reserved });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

       
        [HttpPost("{id}/start-processing")]
        public async Task<IActionResult> StartProcessing(int id)
        {
            try
            {
                var order = await _orderService.StartProcessingAsync(id);
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/complete-picking")]
        public async Task<IActionResult> CompletePicking(int id)
        {
            try
            {
                var order = await _orderService.CompletePickingAsync(id);
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/complete-packing")]
        public async Task<IActionResult> CompletePacking(int id)
        {
            try
            {
                var order = await _orderService.CompletePackingAsync(id);
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

       
        [HttpPost("{id}/create-shipment")]
        public async Task<IActionResult> CreateShipment(int id)
        {
            try
            {
                var shipmentId = await _orderService.CreateShipmentAsync(id);
                return Ok(new { shipmentId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/mark-shipped/{shipmentId}")]
        public async Task<IActionResult> MarkAsShipped(int id, int shipmentId)
        {
            try
            {
                var order = await _orderService.MarkAsShippedAsync(id, shipmentId);
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

     
        [HttpPost("{id}/confirm-delivery")]
        public async Task<IActionResult> ConfirmDelivery(int id)
        {
            try
            {
                var order = await _orderService.ConfirmDeliveryAsync(id);
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/delivery-failed")]
        public async Task<IActionResult> DeliveryFailed(int id, [FromBody] DeliveryFailedRequest request)
        {
            try
            {
                var order = await _orderService.MarkDeliveryFailedAsync(id, request.Reason);
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpPost("{id}/process-return")]
        public async Task<IActionResult> ProcessReturn(int id, [FromBody] ProcessReturnRequest request)
        {
            try
            {
                var order = await _orderService.ProcessReturnAsync(id, request.ReturnedItems);
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/restore-inventory")]
        public async Task<IActionResult> RestoreInventory(int id, [FromBody] ProcessReturnRequest request)
        {
            try
            {
                var restored = await _orderService.RestoreInventoryForReturnAsync(id, request.ReturnedItems);
                return Ok(new { success = restored });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

     
        [HttpGet("{id}/workflow-status")]
        public async Task<IActionResult> GetWorkflowStatus(int id)
        {
            try
            {
                var status = await _orderService.GetOrderWorkflowStatusAsync(id);
                return Ok(new { workflowStatus = status });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }


    public class UpdateOrderStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }

    public class SelectWarehouseRequest
    {
        public string? CustomerAddress { get; set; }
    }

    public class DeliveryFailedRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class ProcessReturnRequest
    {
        public Dictionary<int, int> ReturnedItems { get; set; } = new();
    }
}