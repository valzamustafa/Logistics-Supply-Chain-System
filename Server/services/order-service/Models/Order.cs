using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrderService.Models
{
    public class Order : BaseEntity  
    {
        [Required, MaxLength(50)]
        public string OrderNumber { get; set; } = string.Empty;
        
        [Required]
        public int UserId { get; set; }
        
        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        
        [Required]
        public decimal TotalAmount { get; set; }
        
        public decimal? DiscountAmount { get; set; }
        
        public decimal? TaxAmount { get; set; }
        
        public decimal? ShippingCost { get; set; }
        
        [Required, MaxLength(50)]
        public string Status { get; set; } = "Pending";
        
        [MaxLength(500)]
        public string? ShippingAddress { get; set; }
        
        [MaxLength(500)]
        public string? BillingAddress { get; set; }
        
        public DateTime? ShippedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        

        
        public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}