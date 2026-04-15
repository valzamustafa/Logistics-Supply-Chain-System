using AuthService.Models;

namespace AuthService.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByEmailAsync(string email);
        Task<IEnumerable<User>> GetAllAsync();
        Task<User> CreateAsync(User user);
        Task<User> UpdateAsync(User user);
        Task DeleteAsync(int id);
        Task<bool> ExistsAsync(string email);
        Task<User?> GetUserWithRolesAsync(int id);
        Task<User?> GetUserWithRolesAsync(string email);
    }
}
