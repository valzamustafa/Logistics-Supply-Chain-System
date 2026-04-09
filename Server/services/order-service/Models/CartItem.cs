using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

// order-service/Models/CartItem.cs
namespace OrderService.Models
{
    public class CartItem : BaseEntity
    {
        [Required]
        public int CartId { get; set; }
        
        [Required]
        public int ProductId { get; set; }
        
        [Required]
        public int Quantity { get; set; }
        
        public virtual Cart Cart { get; set; } = null!;
    }
}