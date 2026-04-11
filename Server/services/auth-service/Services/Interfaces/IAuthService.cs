using AuthService.DTOs;

namespace AuthService.Services.Interfaces
{
    public interface IAuthService
    {
        Task<UserResponseDto?> RegisterAsync(RegisterDto dto);
        Task<LoginResponseDto?> LoginAsync(LoginDto dto);
        Task<UserResponseDto?> GetUserByIdAsync(int id);
        Task<UserResponseDto?> GetUserByEmailAsync(string email);
    }
}