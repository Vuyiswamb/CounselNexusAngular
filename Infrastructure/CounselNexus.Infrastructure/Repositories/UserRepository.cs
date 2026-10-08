using CounselNexus.Domain.Entities;
using CounselNexus.Domain.Interfaces;

namespace CounselNexus.Infrastructure.Repositories;

public sealed class UserRepository(IDataLayer dataLayer) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id) => dataLayer.ExecuteStoredProcedureSingleAsync<User>("dbo.User_GetById", new { Id = id });
    public Task<User?> GetByEmailAsync(string email) => dataLayer.ExecuteStoredProcedureSingleAsync<User>("dbo.User_GetByEmail", new { Email = email });
    public Task<User?> GetByUserNameAsync(string userName) => dataLayer.ExecuteStoredProcedureSingleAsync<User>("dbo.User_GetByUserName", new { UserName = userName });
    public Task AddAsync(User user) => dataLayer.ExecuteStoredProcedureAsync("dbo.User_Create", user);
    public Task UpdateAsync(User user) => dataLayer.ExecuteStoredProcedureAsync("dbo.User_Update", user);
    public Task DeleteAsync(Guid id, bool softDelete = true) => dataLayer.ExecuteStoredProcedureAsync("dbo.User_Delete", new { Id = id, SoftDelete = softDelete });
    public Task<IEnumerable<User>> GetByFirmIdAsync(Guid firmId) => dataLayer.ExecuteStoredProcedureAsync<User>("dbo.User_GetByFirmId", new { FirmId = firmId });
}
