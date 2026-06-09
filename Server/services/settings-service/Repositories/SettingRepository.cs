using Microsoft.EntityFrameworkCore;
using SettingsService.Data;
using SettingsService.Models;

namespace SettingsService.Repositories
{
    public class SettingRepository : ISettingRepository
    {
        private readonly SettingsDbContext _context;

        public SettingRepository(SettingsDbContext context)
        {
            _context = context;
        }

        public async Task<List<Setting>> GetAllAsync()
        {
            return await _context.Settings
                .OrderBy(s => s.Key)
                .ToListAsync();
        }

        public async Task<Setting?> GetByIdAsync(int id)
        {
            return await _context.Settings
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<Setting?> GetByKeyAsync(string key)
        {
            return await _context.Settings
                .FirstOrDefaultAsync(s => s.Key == key);
        }

        public async Task<Setting> CreateAsync(Setting setting)
        {
            setting.UpdatedAt = DateTime.UtcNow;
            _context.Settings.Add(setting);
            await _context.SaveChangesAsync();
            return setting;
        }

        public async Task<Setting> UpdateAsync(Setting setting)
        {
            setting.UpdatedAt = DateTime.UtcNow;
            _context.Settings.Update(setting);
            await _context.SaveChangesAsync();
            return setting;
        }

        public async Task DeleteAsync(int id)
        {
            var setting = await _context.Settings.FindAsync(id);
            if (setting != null)
            {
                _context.Settings.Remove(setting);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> KeyExistsAsync(string key)
        {
            return await _context.Settings
                .AnyAsync(s => s.Key == key);
        }
    }
}
