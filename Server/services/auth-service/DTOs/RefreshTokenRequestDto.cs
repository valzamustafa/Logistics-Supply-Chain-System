using System.ComponentModel.DataAnnotations;

namespace AuthService.DTOs
{
    public class RefreshTokenRequestDto
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }
}
