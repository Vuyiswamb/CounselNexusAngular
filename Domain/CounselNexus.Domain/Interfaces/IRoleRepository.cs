using CounselNexus.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CounselNexus.Domain.Interfaces;

public interface IRoleRepository
{
    Task<Role?> GetByIdAsync(Guid id);
    Task<IEnumerable<Role>> GetByFirmIdAsync(Guid firmId);
    Task AddAsync(Role role);
    Task UpdateAsync(Role role);
    Task DeleteAsync(Guid id);
}

