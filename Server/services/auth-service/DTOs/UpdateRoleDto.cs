using System.ComponentModel.DataAnnotations;

namespace AuthService.DTOs
{
    public class UpdateRoleDto
    {
        [Required, MaxLength(50)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string Description { get; set; } = string.Empty;
    }
}
