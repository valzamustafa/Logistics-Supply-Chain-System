using OrderService.DTOs;

namespace OrderService.Services.Interfaces
{
    public interface IOrderService
    {
        Task<OrderDto?> GetOrderByIdAsync(int id);
        Task<IEnumerable<OrderDto>> GetAllOrdersAsync();
        Task<IEnumerable<OrderDto>> GetOrdersByUserAsync(int userId);
        Task<OrderDto> CreateOrderAsync(CreateOrderRequestDto request);
        Task<OrderDto> UpdateOrderStatusAsync(int orderId, string status);
        Task<bool> CancelOrderAsync(int orderId);
    }
}