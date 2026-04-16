using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShipmentService.Data;
using ShipmentService.Models;
using ShipmentService.Repositories.Interfaces;
using ShipmentService.Services.Interfaces;

namespace ShipmentService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Driver")]
    public class DriverProfileController : ControllerBase
    {
        private readonly IDriverRepository _driverRepository;
        private readonly IShipmentService _shipmentService;
        private readonly ShipmentDbContext _context;

        public DriverProfileController(
            IDriverRepository driverRepository,
            IShipmentService shipmentService,
            ShipmentDbContext context)
        {
            _driverRepository = driverRepository;
            _shipmentService = shipmentService;
            _context = context;
        }

        private int? CurrentUserId
        {
            get
            {
                var userIdClaim = User.FindFirst("sub")?.Value ?? 
                                 User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
                if (int.TryParse(userIdClaim, out var id))
                    return id;
                return null;
            }
        }

        private async Task<Driver?> GetCurrentDriverAsync()
        {
            if (!CurrentUserId.HasValue)
                return null;

            return await _driverRepository.GetByUserIdAsync(CurrentUserId.Value);
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var driver = await GetCurrentDriverAsync();
            if (driver == null)
                return NotFound(new { message = "Driver profile not found" });

            // Get user details from Auth Service (you can enhance this)
            var profile = new
            {
                driver.Id,
                driver.UserId,
                driver.LicenseNumber,
                driver.PhoneNumber,
                driver.IsAvailable,
                FirstName = "Driver", // This would come from Auth Service
                LastName = "User",
                Email = $"driver{driver.UserId}@logjistika.com"
            };

            return Ok(profile);
        }

        [HttpPut("availability")]
        public async Task<IActionResult> UpdateAvailability([FromBody] DriverAvailabilityDto dto)
        {
            var driver = await GetCurrentDriverAsync();
            if (driver == null)
                return NotFound(new { message = "Driver profile not found" });

            driver.IsAvailable = dto.IsAvailable;
            driver.UpdatedAt = DateTime.UtcNow;
            await _driverRepository.UpdateAsync(driver);
            return Ok(driver);
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var driver = await GetCurrentDriverAsync();
            if (driver == null)
                return NotFound(new { message = "Driver profile not found" });

            var shipments = await _shipmentService.GetByDriverIdAsync(driver.Id);
            var shipmentsList = shipments.ToList();
            var completed = shipmentsList.Count(s => s.Status != null && s.Status.Contains("Delivered", StringComparison.OrdinalIgnoreCase));
            var pending = shipmentsList.Count(s => s.Status != null && s.Status.Contains("Pending", StringComparison.OrdinalIgnoreCase));
            var today = DateTime.UtcNow.Date;
            var todaysDeliveries = shipmentsList.Count(s => s.EstimatedDeliveryDate.Date == today);
            
            // Calculate total distance (using items count as proxy or actual distance if available)
            var totalDistance = shipmentsList.Sum(s => s.Distance ?? 0);
            
            // Calculate on-time rate
            var onTimeRate = shipmentsList.Count > 0 ? (int)Math.Round((double)completed / shipmentsList.Count * 100) : 0;

            return Ok(new DriverStatsDto
            {
                TodaysDeliveries = todaysDeliveries,
                CompletedDeliveries = completed,
                PendingDeliveries = pending,
                TotalDistance = (int)totalDistance,
                TotalDeliveries = shipmentsList.Count,
                OnTimeRate = onTimeRate,
                AverageRating = 0
            });
        }

        [HttpGet("schedule/today")]
        public async Task<IActionResult> GetTodaySchedule()
        {
            var schedule = await BuildScheduleAsync(DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(1));
            return Ok(schedule);
        }

        [HttpGet("schedule/week")]
        public async Task<IActionResult> GetWeeklySchedule()
        {
            var schedule = await BuildScheduleAsync(DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(7));
            return Ok(schedule);
        }

        private async Task<IEnumerable<DriverScheduleDto>> BuildScheduleAsync(DateTime from, DateTime to)
        {
            var driver = await GetCurrentDriverAsync();
            if (driver == null)
                return Enumerable.Empty<DriverScheduleDto>();

            var shipments = await _shipmentService.GetByDriverIdAsync(driver.Id);
            return shipments
                .Where(s => s.EstimatedDeliveryDate >= from && s.EstimatedDeliveryDate < to)
                .OrderBy(s => s.EstimatedDeliveryDate)
                .Select(s => new DriverScheduleDto
                {
                    Id = s.Id.ToString(),
                    Time = s.EstimatedDeliveryDate.ToString("HH:mm"),
                    Type = s.Status != null && s.Status.Contains("Pickup", StringComparison.OrdinalIgnoreCase) ? "pickup" : "delivery",
                    Location = s.ShippingAddress ?? string.Empty,
                    ShipmentId = s.Id.ToString(),
                    TrackingNumber = s.TrackingNumber,
                    Description = s.Items != null && s.Items.Any() ? string.Join(", ", s.Items.Select(i => i.ProductId)) : string.Empty
                })
                .ToList();
        }
    }

    public class DriverAvailabilityDto
    {
        public bool IsAvailable { get; set; }
    }

    public class DriverStatsDto
    {
        public int TodaysDeliveries { get; set; }
        public int CompletedDeliveries { get; set; }
        public int PendingDeliveries { get; set; }
        public int TotalDistance { get; set; }
        public int TotalDeliveries { get; set; }
        public int OnTimeRate { get; set; }
        public int AverageRating { get; set; }
    }

    public class DriverScheduleDto
    {
        public string Id { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string ShipmentId { get; set; } = string.Empty;
        public string TrackingNumber { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}

