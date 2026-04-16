using OrderService.DTOs;
using OrderService.Models;
using OrderService.Repositories.Interfaces;
using OrderService.Services.Interfaces;


namespace OrderService.Business
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepository;

        public OrderService(IOrderRepository orderRepository)
        {
            _orderRepository = orderRepository;
        }

        public async Task<OrderDto?> GetOrderByIdAsync(int id)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            return order == null ? null : MapToDto(order);
        }

        public async Task<IEnumerable<OrderDto>> GetAllOrdersAsync()
        {
            var orders = await _orderRepository.GetAllAsync();
            return orders.Select(MapToDto);
        }

        public async Task<IEnumerable<OrderDto>> GetOrdersByUserAsync(int userId)
        {
            var orders = await _orderRepository.GetByUserAsync(userId);
            return orders.Select(MapToDto);
        }

        public async Task<OrderDto> CreateOrderAsync(CreateOrderRequestDto request)
        {
            var order = new Order
            {
                UserId = request.UserId,
                ShippingAddress = request.ShippingAddress,
                BillingAddress = request.BillingAddress,
                CreatedBy = request.UserId,
                UpdatedBy = request.UserId
            };

            decimal totalAmount = 0;
            var orderItems = new List<OrderItem>();

            foreach (var item in request.Items)
            {
                var orderItem = new OrderItem
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    DiscountPercent = item.DiscountPercent,
                    CreatedBy = request.UserId,
                    UpdatedBy = request.UserId
                };

                var itemTotal = item.Quantity * item.UnitPrice;
                if (item.DiscountPercent.HasValue)
                    itemTotal -= itemTotal * (item.DiscountPercent.Value / 100);

                totalAmount += itemTotal;
                orderItems.Add(orderItem);
            }

            order.TotalAmount = totalAmount;
            order.OrderItems = orderItems;

            var created = await _orderRepository.CreateAsync(order);
            return MapToDto(created);
        }

        public async Task<OrderDto> UpdateOrderStatusAsync(int orderId, string status)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null)
                throw new InvalidOperationException("Order not found");

            order.Status = status;
            
            if (status == "Shipped")
                order.ShippedAt = DateTime.UtcNow;
            else if (status == "Delivered")
                order.DeliveredAt = DateTime.UtcNow;

            var updated = await _orderRepository.UpdateAsync(order);
            return MapToDto(updated);
        }

        public async Task<bool> CancelOrderAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null || order.Status != "Pending")
                return false;

            order.Status = "Cancelled";
            await _orderRepository.UpdateAsync(order);
            return true;
        }

        private OrderDto MapToDto(Order order)
        {
            return new OrderDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                UserId = order.UserId,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                DiscountAmount = order.DiscountAmount,
                TaxAmount = order.TaxAmount,
                ShippingCost = order.ShippingCost,
                Status = order.Status,
                ShippingAddress = order.ShippingAddress,
                BillingAddress = order.BillingAddress,
                ShippedAt = order.ShippedAt,
                DeliveredAt = order.DeliveredAt,
                Items = order.OrderItems?.Select(i => new OrderItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    DiscountPercent = i.DiscountPercent,
                    TotalPrice = i.Quantity * i.UnitPrice * (1 - (i.DiscountPercent ?? 0) / 100)
                }).ToList() ?? new()
            };
        }
    }
}