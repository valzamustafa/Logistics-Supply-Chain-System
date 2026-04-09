using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace OrderService.Models
{
    public class Cart : BaseEntity
    {
        [Required]
        public int UserId { get; set; }
        
        public DateTime? ExpiresAt { get; set; }
        
        public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    }
}