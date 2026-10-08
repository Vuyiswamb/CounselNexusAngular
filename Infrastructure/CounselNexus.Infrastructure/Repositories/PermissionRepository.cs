using CounselNexus.Domain.Entities;
using CounselNexus.Domain.Interfaces;

namespace CounselNexus.Infrastructure.Repositories;

public sealed class PermissionRepository(IDataLayer dataLayer) : IPermissionRepository
{
    public Task<Permission?> GetByIdAsync(Guid id) => dataLayer.ExecuteStoredProcedureSingleAsync<Permission>("dbo.Permission_GetById", new { Id = id });
    public Task<IEnumerable<Permission>> GetByRoleIdAsync(Guid roleId) => dataLayer.ExecuteStoredProcedureAsync<Permission>("dbo.Permission_GetByRoleId", new { RoleId = roleId });
    public Task AddAsync(Permission permission) => dataLayer.ExecuteStoredProcedureAsync("dbo.Permission_Create", permission);
    public Task DeleteAsync(Guid id) => dataLayer.ExecuteStoredProcedureAsync("dbo.Permission_Delete", new { Id = id });
}
