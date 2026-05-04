using Microsoft.EntityFrameworkCore;
using TrackingService.Data;
using TrackingService.Models;
using TrackingService.Repositories.Interfaces;

namespace TrackingService.Repositories.Implementations
{
    public class TrackingRepository : ITrackingRepository
    {
        private readonly TrackingDbContext _context;

        public TrackingRepository(TrackingDbContext context)
        {
            _context = context;
        }

        public async Task<Tracking?> GetByIdAsync(int id)
        {
            return await _context.Trackings.FindAsync(id);
        }

        public async Task<Tracking?> GetByShipmentIdAsync(int shipmentId)
        {
            return await _context.Trackings
                .FirstOrDefaultAsync(t => t.ShipmentId == shipmentId);
        }

        public async Task<IEnumerable<Tracking>> GetAllAsync()
        {
            return await _context.Trackings.ToListAsync();
        }

        public async Task<Tracking> CreateAsync(Tracking tracking)
        {
            _context.Trackings.Add(tracking);
            await _context.SaveChangesAsync();
            return tracking;
        }

        public async Task<Tracking> UpdateAsync(Tracking tracking)
        {
            _context.Entry(tracking).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return tracking;
        }

        public async Task<bool> ExistsByShipmentIdAsync(int shipmentId)
        {
            return await _context.Trackings
                .AnyAsync(t => t.ShipmentId == shipmentId);
        }
    }
}