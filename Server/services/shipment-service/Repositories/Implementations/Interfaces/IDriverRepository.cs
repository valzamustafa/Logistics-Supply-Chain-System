using ShipmentService.Models;

namespace ShipmentService.Repositories.Interfaces;

public interface IDriverRepository
{
    Task<IEnumerable<Driver>> GetAllAsync();
    Task<Driver?> GetByIdAsync(int id);
    Task<Driver?> GetByUserIdAsync(int userId);
    Task<IEnumerable<Driver>> GetAvailableAsync();
    Task<Driver> CreateAsync(Driver driver);
    Task<Driver> UpdateAsync(Driver driver);
    Task DeleteAsync(int id);
}