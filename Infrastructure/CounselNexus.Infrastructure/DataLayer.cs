using System.Data;
using Microsoft.Data.SqlClient;
using CounselNexus.Domain.Interfaces;
using System.Reflection;

namespace CounselNexus.Infrastructure;

public class DataLayer : IDataLayer
{
    private readonly string _connectionString;
    public DataLayer(string connectionString)
    {
        _connectionString = string.IsNullOrWhiteSpace(connectionString)
            ? throw new InvalidOperationException("Connection string not found.")
            : connectionString;
    }

    public async Task<IEnumerable<T>> ExecuteStoredProcedureAsync<T>(string procedureName, object parameters)
    {
        var results = new List<T>();
        using var connection = new SqlConnection(_connectionString);
        using var command = new SqlCommand(procedureName, connection);
        command.CommandType = CommandType.StoredProcedure;

        MapParameters(command, parameters);

        await connection.OpenAsync();
        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) results.Add(Map<T>(reader));
        return results;
    }

    public async Task<T?> ExecuteStoredProcedureSingleAsync<T>(string procedureName, object parameters)
    {
        var rows = await ExecuteStoredProcedureAsync<T>(procedureName, parameters);
        return rows.FirstOrDefault();
    }

    public async Task ExecuteStoredProcedureAsync(string procedureName, object parameters)
    {
        using var connection = new SqlConnection(_connectionString);
        using var command = new SqlCommand(procedureName, connection);
        command.CommandType = CommandType.StoredProcedure;

        MapParameters(command, parameters);

        await connection.OpenAsync();
        await command.ExecuteNonQueryAsync();
    }

    private void MapParameters(SqlCommand command, object parameters)
    {
        if (parameters is null) return;
        foreach (var property in parameters.GetType().GetProperties(BindingFlags.Instance | BindingFlags.Public))
        {
            var value = property.GetValue(parameters) ?? DBNull.Value;
            command.Parameters.AddWithValue("@" + property.Name, value);
        }
    }

    private static T Map<T>(SqlDataReader reader)
    {
        if (typeof(T) == typeof(string)) return (T)(object)Convert.ToString(reader[0])!;
        var instance = Activator.CreateInstance<T>();
        var properties = typeof(T).GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(p => p.CanWrite).ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < reader.FieldCount; i++)
        {
            if (!properties.TryGetValue(reader.GetName(i), out var property) || reader.IsDBNull(i)) continue;
            var targetType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
            var value = reader.GetValue(i);
            if (targetType.IsEnum) value = Enum.Parse(targetType, value.ToString()!, true);
            else if (targetType == typeof(Guid)) value = value is Guid guid ? guid : Guid.Parse(value.ToString()!);
            else if (targetType != value.GetType()) value = Convert.ChangeType(value, targetType);
            property.SetValue(instance, value);
        }
        return instance;
    }
}

