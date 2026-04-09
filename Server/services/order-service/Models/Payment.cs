using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

// order-service/Models/Payment.cs
namespace OrderService.Models
{
    public class Payment : BaseEntity
    {
        [Required]
        public int OrderId { get; set; }
        
        [Required, MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty; 
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required, MaxLength(50)]
        public string Status { get; set; } = "Pending"; 
        
        [MaxLength(100)]
        public string? TransactionId { get; set; }
        
        public DateTime? CompletedAt { get; set; }
        
        public virtual Order Order { get; set; } = null!;
        public virtual ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
    }
}