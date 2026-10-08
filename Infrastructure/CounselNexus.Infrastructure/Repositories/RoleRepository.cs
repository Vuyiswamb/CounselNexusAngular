using CounselNexus.Domain.Entities;
using CounselNexus.Domain.Interfaces;

namespace CounselNexus.Infrastructure.Repositories;

public sealed class RoleRepository(IDataLayer dataLayer) : IRoleRepository
{
    public Task<Role?> GetByIdAsync(Guid id) => dataLayer.ExecuteStoredProcedureSingleAsync<Role>("dbo.Role_GetById", new { Id = id });
    public Task<IEnumerable<Role>> GetByFirmIdAsync(Guid firmId) => dataLayer.ExecuteStoredProcedureAsync<Role>("dbo.Role_GetByFirmId", new { FirmId = firmId });
    public Task AddAsync(Role role) => dataLayer.ExecuteStoredProcedureAsync("dbo.Role_Create", role);
    public Task UpdateAsync(Role role) => dataLayer.ExecuteStoredProcedureAsync("dbo.Role_Update", role);
    public Task DeleteAsync(Guid id) => dataLayer.ExecuteStoredProcedureAsync("dbo.Role_Delete", new { Id = id });
}
