using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

// product-service/Models/ProductImage.cs
namespace ProductService.Models
{
    public class ProductImage : BaseEntity
    {
        [Required]
        public int ProductId { get; set; }
        
        [Required, MaxLength(500)]
        public string ImageUrl { get; set; } = string.Empty;
        
        public bool IsPrimary { get; set; }
        
        public int DisplayOrder { get; set; }
        
        public virtual Product Product { get; set; } = null!;
    }
}