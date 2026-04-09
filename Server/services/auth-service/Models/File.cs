using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthService.Models
{
    public class File : BaseEntity
    {
        [Required, MaxLength(100)]
        public string Entity { get; set; } = string.Empty;
        
        [Required]
        public int EntityId { get; set; }
        
        [Required, MaxLength(255)]
        public string FileName { get; set; } = string.Empty;
        
        [Required, MaxLength(500)]
        public string FilePath { get; set; } = string.Empty;
        
        public long FileSize { get; set; }
        
        [Required]
        public int UploadedBy { get; set; }
        
        [ForeignKey(nameof(UploadedBy))]
        public virtual User Uploader { get; set; } = null!;
    }
}