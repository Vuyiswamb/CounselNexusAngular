using CounselNexus.Domain.Entities;
using CounselNexus.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CounselNexus.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(IUserRepository repository) : ControllerBase
{
    [HttpGet("by-firm/{firmId:guid}")]
    public async Task<ActionResult<IEnumerable<User>>> ByFirm(Guid firmId) => Ok(await repository.GetByFirmIdAsync(firmId));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<User>> Get(Guid id) => (await repository.GetByIdAsync(id)) is { } user ? Ok(user) : NotFound();

    [HttpPost]
    public async Task<ActionResult> Create(User user)
    {
        if (user.Id == Guid.Empty) user.Id = Guid.NewGuid();
        if (string.IsNullOrWhiteSpace(user.Email) || string.IsNullOrWhiteSpace(user.UserName)) return ValidationProblem("Username and email are required.");
        await repository.AddAsync(user);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, User user)
    {
        if (id != user.Id) return BadRequest("Route id and user id must match.");
        if (await repository.GetByIdAsync(id) is null) return NotFound();
        await repository.UpdateAsync(user);
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
