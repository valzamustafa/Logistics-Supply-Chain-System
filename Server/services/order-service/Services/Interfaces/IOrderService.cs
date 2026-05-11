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
        Task<byte[]> GenerateInvoicePdfAsync(OrderDto order);
        
      
        Task<int> SelectOptimalWarehouseAsync(int orderId, string? customerAddress = null);
        Task<OrderDto> AssignWarehouseAsync(int orderId, int warehouseId);
        
      
        Task<bool> ValidateInventoryAsync(int orderId);
        Task<bool> ReserveInventoryAsync(int orderId);
        Task<bool> DeductInventoryAsync(int orderId);
        Task<bool> ReleaseInventoryAsync(int orderId);
        
     
        Task<OrderDto> StartProcessingAsync(int orderId);
        Task<OrderDto> UpdateProcessingStatusAsync(int orderId, string processingStatus);
        Task<OrderDto> CompletePickingAsync(int orderId);
        Task<OrderDto> CompletePackingAsync(int orderId);
        
       
        Task<int> CreateShipmentAsync(int orderId);
        Task<OrderDto> MarkAsShippedAsync(int orderId, int shipmentId);
        
        
        Task<OrderDto> ConfirmDeliveryAsync(int orderId);
        Task<OrderDto> MarkDeliveryFailedAsync(int orderId, string reason);
        
    
        Task<OrderDto> ProcessReturnAsync(int orderId, Dictionary<int, int> returnedItems);
        Task<bool> RestoreInventoryForReturnAsync(int orderId, Dictionary<int, int> returnedItems);
        
     
        Task<string> GetOrderWorkflowStatusAsync(int orderId);
    }
}