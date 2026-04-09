using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductService.Models
{
    public class Product : BaseEntity 
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required, MaxLength(50)]
        public string SKU { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [Required]
        public decimal Price { get; set; }
        
        public decimal? Cost { get; set; }
        
        public int CategoryId { get; set; }
        
        public bool IsActive { get; set; } = true;
       
        
        [ForeignKey(nameof(CategoryId))]
        public virtual Category Category { get; set; } = null!;
    }
}