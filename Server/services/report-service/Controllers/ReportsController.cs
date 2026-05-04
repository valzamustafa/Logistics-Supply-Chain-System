using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReportService.DTOs;
using ReportService.Services.Interfaces;

namespace ReportService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var reports = await _reportService.GetAllAsync();
        return Ok(reports);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var report = await _reportService.GetByIdAsync(id);
        if (report == null)
            return NotFound();
        return Ok(report);
    }

    [HttpGet("type/{type}")]
    public async Task<IActionResult> GetByType(string type)
    {
        var reports = await _reportService.GetByTypeAsync(type);
        return Ok(reports);
    }

    [HttpPost("generate")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GenerateReport([FromBody] GenerateReportDto dto)
    {
        if (string.IsNullOrEmpty(dto.Type) || string.IsNullOrEmpty(dto.Name))
        {
            return BadRequest(new { message = "Type and Name are required" });
        }

        var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("nameid")?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
            return Unauthorized();

        var userId = int.Parse(userIdClaim);
        
        var report = await _reportService.GenerateReportAsync(dto, userId);
        return Ok(report);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _reportService.DeleteAsync(id);
        if (!deleted)
            return NotFound();
        return NoContent();
    }

    [HttpGet("summary")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetSummary()
    {
        var summary = await _reportService.GetSummaryAsync();
        return Ok(summary);
    }

    [HttpGet("{id}/pdf")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        var report = await _reportService.GetByIdAsync(id);
        if (report == null)
            return NotFound();

        var pdfBytes = await _reportService.GeneratePdfAsync(report);
        
        
        var fileName = $"{report.Type}_{report.Name}_{DateTime.Now:yyyyMMdd}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }
}