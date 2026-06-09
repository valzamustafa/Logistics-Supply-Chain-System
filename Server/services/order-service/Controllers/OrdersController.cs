using Microsoft.AspNetCore.Mvc;
using OrderService.DTOs;
using OrderService.Services.Interfaces;
using OrderService.Hubs;
using BuildingBlocks;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace OrderService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly INotificationClient _notificationClient;
        private readonly ILogger<OrdersController> _logger;
        private readonly IHubContext<DashboardHub> _hubContext;

        public OrdersController(
            IOrderService orderService, 
            IHttpClientFactory httpClientFactory, 
            IConfiguration configuration,
            INotificationClient notificationClient,
            ILogger<OrdersController> logger,
            IHubContext<DashboardHub> hubContext)
        {
            _orderService = orderService;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _notificationClient = notificationClient;
            _logger = logger;
            _hubContext = hubContext;
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
                
             
                await _notificationClient.SendNotificationAsync(
                    request.UserId,
                    "OrderCreated",
                    "Order Created Successfully",
                    $"Your order #{order.OrderNumber} has been created successfully. Total: ${order.TotalAmount}",
                    $"/orders/{order.Id}"
                );
                
              
                if (order.TotalAmount > 10000)
                {
                    await _notificationClient.SendNotificationToRoleAsync(
                        "Admin",
                        "LargeOrder",
                        "Large Order Alert",
                        $"Large order #{order.OrderNumber} of ${order.TotalAmount:F2} requires attention.",
                        $"/admin/orders/{order.Id}"
                    );
                }
                
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
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto request)
        {
            try
            {
                var order = await _orderService.UpdateOrderStatusAsync(id, request.Status);
                
               
                string message = request.Status switch
                {
                    "Processing" => "Your order is being processed.",
                    "Shipped" => $"Your order has been shipped!",
                    "Delivered" => "Your order has been delivered. Thank you for shopping with us!",
                    "Cancelled" => "Your order has been cancelled.",
                    _ => $"Your order status has been updated to: {request.Status}"
                };
                
                await _notificationClient.SendNotificationAsync(
                    order.UserId,
                    "OrderStatusUpdated",
                    $"Order {request.Status}",
                    message,
                    $"/orders/{order.Id}"
                );

                
                var currentUser = GetCurrentUserName();
                await BroadcastOrderUpdateToShipmentService(order.Id, order.Id, request.Status, currentUser);

               
                await _hubContext.Clients.All.SendAsync("ReceiveOrderUpdate", new
                {
                    orderId = order.Id,
                    purchaseOrderId = order.Id,
                    status = request.Status,
                    purchaseOrderStatus = request.Status,
                    actor = currentUser
                });
                
                return Ok(order);
            }
            catch (InvalidOperationException)
            {
                return NotFound(new { message = $"Order with ID {id} not found" });
            }
        }

        private string GetCurrentUserName()
        {
            var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            return !string.IsNullOrEmpty(email) ? email : user;
        }

        private async Task BroadcastOrderUpdateToShipmentService(int orderId, int purchaseOrderId, string status, string actor)
        {
            try
            {
                var shipmentServiceUrl = _configuration["Services:ShipmentService"] ?? "http://localhost:5004";
                var client = _httpClientFactory.CreateClient();
                
                
                client.DefaultRequestHeaders.Add("X-Internal-Request", "true");

                var updateData = new
                {
                    orderId,
                    purchaseOrderId,
                    status,
                    actor
                };

                var content = new StringContent(
                    System.Text.Json.JsonSerializer.Serialize(updateData),
                    System.Text.Encoding.UTF8,
                    "application/json");

                var response = await client.PostAsync(
                    $"{shipmentServiceUrl}/api/shipments/broadcast-order-update",
                    content);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to broadcast order update to shipment service: {StatusCode}", response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error broadcasting order update to shipment service");
              
            }
        }

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            var cancelled = await _orderService.CancelOrderAsync(id);
            if (!cancelled)
                return BadRequest(new { message = "Order cannot be cancelled" });
            
            var order = await _orderService.GetOrderByIdAsync(id);
            if (order != null)
            {
                await _notificationClient.SendNotificationAsync(
                    order.UserId,
                    "OrderCancelled",
                    "Order Cancelled",
                    $"Your order #{order.OrderNumber} has been cancelled.",
                    $"/orders/{order.Id}"
                );

               
                var currentUser = GetCurrentUserName();
                await BroadcastOrderUpdateToShipmentService(order.Id, order.Id, "Cancelled", currentUser);
                
                await _hubContext.Clients.All.SendAsync("ReceiveOrderUpdate", new
                {
                    orderId = order.Id,
                    purchaseOrderId = order.Id,
                    status = "Cancelled",
                    purchaseOrderStatus = "Cancelled",
                    actor = currentUser
                });
            }
            
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
                
                await _notificationClient.SendNotificationAsync(
                    order.UserId,
                    "WarehouseAssigned",
                    "Warehouse Assigned",
                    $"Your order #{order.OrderNumber} has been assigned to warehouse #{warehouseId} for fulfillment.",
                    $"/orders/{order.Id}"
                );
                
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
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager")]
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
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> StartProcessing(int id)
        {
            try
            {
                var order = await _orderService.StartProcessingAsync(id);
                
                await _notificationClient.SendNotificationAsync(
                    order.UserId,
                    "OrderProcessing",
                    "Order Processing Started",
                    $"Your order #{order.OrderNumber} has started processing.",
                    $"/orders/{order.Id}"
                );

             
                var currentUser = GetCurrentUserName();
                await BroadcastOrderUpdateToShipmentService(order.Id, order.Id, "Processing", currentUser);
                
                await _hubContext.Clients.All.SendAsync("ReceiveOrderUpdate", new
                {
                    orderId = order.Id,
                    purchaseOrderId = order.Id,
                    status = "Processing",
                    purchaseOrderStatus = "Processing",
                    actor = currentUser
                });
                
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/complete-picking")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> CompletePicking(int id)
        {
            try
            {
                var order = await _orderService.CompletePickingAsync(id);
                
                
                var currentUser = GetCurrentUserName();
                await BroadcastOrderUpdateToShipmentService(order.Id, order.Id, order.Status, currentUser);
                
                await _hubContext.Clients.All.SendAsync("ReceiveOrderUpdate", new
                {
                    orderId = order.Id,
                    purchaseOrderId = order.Id,
                    status = order.Status,
                    purchaseOrderStatus = order.Status,
                    actor = currentUser
                });
                
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/complete-packing")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> CompletePacking(int id)
        {
            try
            {
                var order = await _orderService.CompletePackingAsync(id);
                
               
                var currentUser = GetCurrentUserName();
                await BroadcastOrderUpdateToShipmentService(order.Id, order.Id, order.Status, currentUser);
                
                await _hubContext.Clients.All.SendAsync("ReceiveOrderUpdate", new
                {
                    orderId = order.Id,
                    purchaseOrderId = order.Id,
                    status = order.Status,
                    purchaseOrderStatus = order.Status,
                    actor = currentUser
                });
                
                return Ok(order);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/create-shipment")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> CreateShipment(int id)
        {
            try
            {
                var shipmentId = await _orderService.CreateShipmentAsync(id);
                
                var order = await _orderService.GetOrderByIdAsync(id);
                if (order != null)
                {
                    await _notificationClient.SendNotificationAsync(
                        order.UserId,
                        "ShipmentCreated",
                        "Shipment Created",
                        $"Shipment has been created for your order #{order.OrderNumber}.",
                        $"/tracking/{shipmentId}"
                    );
                }
                
                return Ok(new { shipmentId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/mark-shipped/{shipmentId}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Policy = "manage_orders")]
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
                
                await _notificationClient.SendNotificationAsync(
                    order.UserId,
                    "OrderDelivered",
                    "Order Delivered!",
                    $"Your order #{order.OrderNumber} has been delivered successfully. Thank you for shopping with us!",
                    $"/orders/{order.Id}/review"
                );
                
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
                
                await _notificationClient.SendNotificationAsync(
                    order.UserId,
                    "DeliveryFailed",
                    "Delivery Failed",
                    $"Delivery for order #{order.OrderNumber} failed. Reason: {request.Reason}",
                    $"/orders/{order.Id}"
                );
                
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
                
                await _notificationClient.SendNotificationAsync(
                    order.UserId,
                    "ReturnProcessed",
                    "Return Processed",
                    $"Your return for order #{order.OrderNumber} has been processed.",
                    $"/orders/{order.Id}"
                );
                
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