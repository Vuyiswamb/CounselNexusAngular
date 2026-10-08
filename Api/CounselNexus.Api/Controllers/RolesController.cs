using CounselNexus.Domain.Entities;
using CounselNexus.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CounselNexus.Api.Controllers;

[ApiController]
[Route("api/roles")]
public sealed class RolesController(IRoleRepository roles, IPermissionRepository permissions) : ControllerBase
{
    [HttpGet("by-firm/{firmId:guid}")]
    public async Task<ActionResult<IEnumerable<Role>>> ByFirm(Guid firmId) => Ok(await roles.GetByFirmIdAsync(firmId));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Role>> Get(Guid id) => (await roles.GetByIdAsync(id)) is { } role ? Ok(role) : NotFound();

    [HttpGet("{roleId:guid}/permissions")]
    public async Task<ActionResult<IEnumerable<Permission>>> GetPermissions(Guid roleId) => Ok(await permissions.GetByRoleIdAsync(roleId));

    [HttpPost]
    public async Task<ActionResult> Create(Role role)
    {
        if (role.Id == Guid.Empty) role.Id = Guid.NewGuid();
        if (string.IsNullOrWhiteSpace(role.Name)) return ValidationProblem("Role name is required.");
        await roles.AddAsync(role);
        return CreatedAtAction(nameof(Get), new { id = role.Id }, role);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, Role role)
    {
        if (id != role.Id) return BadRequest("Route id and role id must match.");
        if (await roles.GetByIdAsync(id) is null) return NotFound();
        await roles.UpdateAsync(role);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        if (await roles.GetByIdAsync(id) is null) return NotFound();
        await roles.DeleteAsync(id);
        return NoContent();
    }
}
