using CounselNexus.Domain.Entities;
using CounselNexus.Domain.Interfaces;

namespace CounselNexus.Infrastructure.Repositories;

public sealed class FirmRepository(IDataLayer dataLayer) : IFirmRepository
{
    public Task<Firm?> GetByIdAsync(Guid id) => dataLayer.ExecuteStoredProcedureSingleAsync<Firm>("dbo.Firm_GetById", new { Id = id });
    public Task<IEnumerable<Firm>> GetAllAsync() => dataLayer.ExecuteStoredProcedureAsync<Firm>("dbo.Firm_GetAll", new { });
    public Task AddAsync(Firm firm) => dataLayer.ExecuteStoredProcedureAsync("dbo.Firm_Create", firm);
    public Task UpdateAsync(Firm firm) => dataLayer.ExecuteStoredProcedureAsync("dbo.Firm_Update", firm);
    public Task DeleteAsync(Guid id) => dataLayer.ExecuteStoredProcedureAsync("dbo.Firm_Delete", new { Id = id });
}
