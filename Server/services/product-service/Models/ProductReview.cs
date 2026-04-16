using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace ProductService.Models
{
    public class ProductReview : BaseEntity
    {
        [Required]
        public int ProductId { get; set; }
        
        [Required]
        public int UserId { get; set; }
        
        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }
        
        [MaxLength(1000)]
        public string? Comment { get; set; }
        
        public bool IsApproved { get; set; } = false;
        
        public virtual Product Product { get; set; } = null!;
    }
}