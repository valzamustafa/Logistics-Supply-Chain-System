using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShipmentService.Models
{
    public class Driver : BaseEntity  
    {
        [Required]
        public int UserId { get; set; }
        
        [Required, MaxLength(50)]
        public string LicenseNumber { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? PhoneNumber { get; set; }
        
        public bool IsAvailable { get; set; } = true;
        
        public virtual ICollection<DriverAssignment> Assignments { get; set; } = new List<DriverAssignment>();
    }
}