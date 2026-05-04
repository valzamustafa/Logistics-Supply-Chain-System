using System.Text.Json.Serialization;
using WarehouseService.Models;

namespace WarehouseService.DTOs
{
    public class UpdateStockDto
    {
        public int Quantity { get; set; }
        
        
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public MovementType Type { get; set; }
        
        public string? Reference { get; set; }
        public string? Notes { get; set; }
    }
}