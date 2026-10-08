using CounselNexus.Domain.Entities;
using CounselNexus.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CounselNexus.Api.Controllers;

[ApiController]
[Route("api/firms")]
public sealed class FirmsController(IFirmRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Firm>>> GetAll() => Ok(await repository.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Firm>> Get(Guid id) => (await repository.GetByIdAsync(id)) is { } firm ? Ok(firm) : NotFound();

    [HttpPost]
    public async Task<ActionResult> Create(Firm firm)
    {
        if (string.IsNullOrWhiteSpace(firm.Name)) return ValidationProblem("Firm name is required.");
        if (firm.Id == Guid.Empty) firm.Id = Guid.NewGuid();
        await repository.AddAsync(firm);
        return CreatedAtAction(nameof(Get), new { id = firm.Id }, firm);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, Firm firm)
    {
        if (id != firm.Id) return BadRequest("Route id and firm id must match.");
        if (await repository.GetByIdAsync(id) is null) return NotFound();
        await repository.UpdateAsync(firm);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        if (await repository.GetByIdAsync(id) is null) return NotFound();
        await repository.DeleteAsync(id);
        return NoContent();
    }
}
