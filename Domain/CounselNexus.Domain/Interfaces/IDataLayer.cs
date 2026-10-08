using System.Data;
using System.Threading.Tasks;

namespace CounselNexus.Domain.Interfaces;

public interface IDataLayer
{
    Task<IEnumerable<T>> ExecuteStoredProcedureAsync<T>(string procedureName, object parameters);
    Task<T?> ExecuteStoredProcedureSingleAsync<T>(string procedureName, object parameters);
    Task ExecuteStoredProcedureAsync(string procedureName, object parameters);
}

