using CounselNexus.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CounselNexus.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByUserNameAsync(string userName);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task DeleteAsync(Guid id, bool softDelete = true);
    Task<IEnumerable<User>> GetByFirmIdAsync(Guid firmId);
}

