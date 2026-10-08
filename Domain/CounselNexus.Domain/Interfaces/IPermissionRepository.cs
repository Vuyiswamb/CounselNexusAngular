using CounselNexus.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CounselNexus.Domain.Interfaces;

public interface IPermissionRepository
{
    Task<Permission?> GetByIdAsync(Guid id);
    Task<IEnumerable<Permission>> GetByRoleIdAsync(Guid roleId);
    Task AddAsync(Permission permission);
    Task DeleteAsync(Guid id);
}

