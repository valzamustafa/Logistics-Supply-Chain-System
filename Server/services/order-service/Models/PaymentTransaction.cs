using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

// order-service/Models/PaymentTransaction.cs
namespace OrderService.Models
{
    public class PaymentTransaction : BaseEntity
    {
        [Required]
        public int PaymentId { get; set; }
        
        [Required, MaxLength(100)]
        public string TransactionReference { get; set; } = string.Empty;
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required, MaxLength(50)]
        public string Status { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? ResponseData { get; set; }
        
        public virtual Payment Payment { get; set; } = null!;
    }
}