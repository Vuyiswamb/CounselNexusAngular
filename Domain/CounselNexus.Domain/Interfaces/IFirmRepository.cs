using CounselNexus.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CounselNexus.Domain.Interfaces;

public interface IFirmRepository
{
    Task<Firm?> GetByIdAsync(Guid id);
    Task<IEnumerable<Firm>> GetAllAsync();
    Task AddAsync(Firm firm);
    Task UpdateAsync(Firm firm);
    Task DeleteAsync(Guid id);
}

