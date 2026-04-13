using Microsoft.AspNetCore.Mvc;
using ReportService.DTOs;
using ReportService.Services.Interfaces;

namespace ReportService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _service;

        public ReportsController(IReportService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var reports = await _service.GetAllReportsAsync();
            return Ok(reports);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var report = await _service.GetReportByIdAsync(id);
            return report == null ? NotFound() : Ok(report);
        }

        [HttpGet("type/{type}")]
        public async Task<IActionResult> GetByType(string type)
        {
            var reports = await _service.GetReportsByTypeAsync(type);
            return Ok(reports);
        }

        [HttpGet("daterange")]
        public async Task<IActionResult> GetByDateRange([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            var reports = await _service.GetReportsByDateRangeAsync(start, end);
            return Ok(reports);
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var summary = await _service.GetReportSummaryAsync();
            return Ok(summary);
        }

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] GenerateReportDto dto)
        {
            var report = await _service.GenerateReportAsync(dto, 1);
            return Ok(report);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteReportAsync(id);
            return deleted ? NoContent() : NotFound();
        }
    }
}