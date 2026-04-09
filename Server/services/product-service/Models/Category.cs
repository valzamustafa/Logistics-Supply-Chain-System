using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

// product-service/Models/Category.cs
namespace ProductService.Models
{
    public class Category : BaseEntity
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? Description { get; set; }
        
        public int? ParentCategoryId { get; set; }
        
        public virtual Category? ParentCategory { get; set; }
        public virtual ICollection<Category> SubCategories { get; set; } = new List<Category>();
        public virtual ICollection<Product> Products { get; set; } = new List<Product>();
    }
}