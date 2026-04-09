using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrderService.Models
{
    public class OrderItem : BaseEntity
    {
        [Required]
        public int OrderId { get; set; }
        
        [Required]
        public int ProductId { get; set; }
        
        [Required]
        public int Quantity { get; set; }
        
        [Required]
        public decimal UnitPrice { get; set; }
        
        public decimal? DiscountPercent { get; set; }
        
        public decimal TotalPrice => Quantity * UnitPrice * (1 - (DiscountPercent ?? 0) / 100);
        
        public virtual Order Order { get; set; } = null!;
    }
}