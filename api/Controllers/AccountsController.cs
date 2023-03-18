using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("[controller]")]
public class AccountsController : ControllerBase
{
    private readonly ILogger<AccountsController> _logger;

    public AccountsController(ILogger<AccountsController> logger)
    {
        _logger = logger;
    }

    [HttpGet()]
    public IEnumerable<dynamic> Get([FromQuery] string? q)
    {
        this._logger.LogInformation("/accounts");

        var queryItems = query(q).Reverse().ToList();

        var result = Data.Instance.LabeledItems.Select(
            i => new
            {
                Address = i.Address,
                Label = i.Label,
                Factors = i.Factors3d,
                QueryScore = queryItems.IndexOf(i)
            }
        );

        if (queryItems.Count() > 0)
        {
            result = result.Concat(
             Data.Instance.UnlabeledItems.Select(
                i => new
                {
                    Address = i.Address,
                    Label = i.Label,
                    Factors = i.Factors3d,
                    QueryScore = queryItems.IndexOf(i)
                }).Where(i => i.QueryScore >= 0)
            );
        }

        return result;
    }

    [HttpGet("{id}")]
    public IEnumerable<dynamic> GetById(string id, [FromQuery] string? q)
    {
        this._logger.LogInformation("/accounts/" + id);

        if (!Data.Instance.ItemsDict.ContainsKey(id))
        {
            Response.StatusCode = StatusCodes.Status404NotFound;
            return new List<dynamic>();
        }

        var selectedAccount = Data.Instance.ItemsDict[id];

        var queryItems = query(q).Reverse().ToList();

        var result = Data.Instance.UnlabeledItems.Select(
            i => new
            {
                Address = i.Address,
                Label = i.Label,
                Factors = i.Factors3d,
                Distance = EuclideanDistance.Calculate(selectedAccount.Factors, i.Factors),
                QueryScore = queryItems.IndexOf(i)
            }
        ).OrderBy(i => i.Distance).Take(1000)
        .ToList<dynamic>()
        .Concat(Data.Instance.LabeledItems.Select(
            i => new
            {
                Address = i.Address,
                Label = i.Label,
                Factors = i.Factors3d,
                Distance = EuclideanDistance.Calculate(selectedAccount.Factors, i.Factors),
                QueryScore = queryItems.IndexOf(i)
            }
        ));

        return result.Concat(
            queryItems.Where(i => result.FirstOrDefault(r => r.Address == i.Address) == null)
                .Select(i => new
                {
                    Address = i.Address,
                    Label = i.Label,
                    Factors = i.Factors3d,
                    Distance = EuclideanDistance.Calculate(selectedAccount.Factors, i.Factors),
                    QueryScore = queryItems.IndexOf(i)
                })
        ).OrderBy(i => i.Distance);
    }

    private IEnumerable<dynamic> query(string q)
    {
        if (String.IsNullOrEmpty(q?.Trim()))
        {
            return new List<dynamic>();
        }

        var query = q.ToLower().Trim();

        IEnumerable<dynamic> items;

        if (query.Length >= 32)
        {
            items = Data.Instance.Items.Where(
                i => i.Address.ToLower().Contains(query)
            ).ToList<dynamic>();
        }
        else
        {
            items = Data.Instance.FullTextIndex.Search(q)
                .Select(s => Data.Instance.LabeledItemsDict[s.Key]);
        }

        return items;
    }
}
