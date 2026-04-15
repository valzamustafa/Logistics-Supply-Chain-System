
using System.ComponentModel.DataAnnotations;

namespace AuthService.DTOs
{
    public class UpdateUserDto
    {
        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required, MaxLength(100)]
        public string LastName { get; set; } = string.Empty;
        
        [Required, EmailAddress, MaxLength(255)]
        public string Email { get; set; } = string.Empty;
        
        public bool IsActive { get; set; } = true;
    }
}

