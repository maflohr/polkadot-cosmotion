using System.Globalization;
using Lifti;

public sealed class Data
{
    private static readonly Lazy<Data> lazy
        = new Lazy<Data>(() => new Data());

    public static Data Instance
        => lazy.Value;

    public IEnumerable<dynamic> Items { get; private set; } = new List<dynamic>();
    public IEnumerable<dynamic> UnlabeledItems { get; private set; } = new List<dynamic>();
    public IDictionary<string, dynamic> ItemsDict { get; private set; } = new Dictionary<string, dynamic>();
    public IEnumerable<dynamic> LabeledItems { get; private set; } = new List<dynamic>();
    public IDictionary<string, dynamic> LabeledItemsDict { get; private set; } = new Dictionary<string, dynamic>();
    public FullTextIndex<string> FullTextIndex { get; private set; } = new FullTextIndexBuilder<string>()
            .WithSimpleQueryParser()
            .WithObjectTokenization<dynamic>(
                itemOptions => itemOptions
                    .WithKey(i => i.Address)
                    .WithField(
                        "Label",
                        i => i.Label as string,
                        tokenOptions => tokenOptions.CaseInsensitive()
                    )
            )
            .Build();

    private const string itemsFileName = "../data/items.tsv";
    private const string factorsFileName = "../data/factors.tsv";
    private const string factors3dFileName = "../data/factors-3d.tsv";

    private Data()
    {
        var itemsFs = new FileStream(itemsFileName, FileMode.Open);

        string line;

        int lineNumber = 0;

        var items = (List<dynamic>)Items;
        var unlabeledItems = (List<dynamic>)UnlabeledItems;
        var labeledItems = (List<dynamic>)LabeledItems;

        var numFactors = 0;

        using (var r = new StreamReader(factorsFileName)) {
            numFactors = r.ReadLine().Split('\t').Length;
        }

        using (var r = new StreamReader(itemsFs))
        {
            while ((line = r.ReadLine()) != null)
            {
                lineNumber++;

                if (lineNumber == 1)
                {
                    continue;
                }

                var parts = line.Split('\t');

                dynamic item = new
                {
                    Address = parts[1],
                    Label = parts[0],
                    Factors = new double [numFactors],
                    Factors3d = new double [3]
                };

                if (!String.IsNullOrEmpty(item.Label))
                {
                    labeledItems.Add(item);
                    LabeledItemsDict.Add(item.Address, item);
                }
                else
                {
                    unlabeledItems.Add(item);
                }

                items.Add(item);
                ItemsDict.Add(item.Address, item);
            }
        }

        var factorsFs = new FileStream(factorsFileName, FileMode.Open);

        using (var r = new StreamReader(factorsFs))
        {
            lineNumber = 0;

            while ((line = r.ReadLine()) != null)
            {
                lineNumber++;

                var parts = line.Split('\t');

                var item = items[lineNumber - 1];

                Array.Copy(parts.Select(p => double.Parse(p, CultureInfo.InvariantCulture)).ToArray(), item.Factors, numFactors);
            }
        }

        var factors3dFs = new FileStream(factors3dFileName, FileMode.Open);

        using (var r = new StreamReader(factors3dFs))
        {
            lineNumber = 0;

            while ((line = r.ReadLine()) != null)
            {
                lineNumber++;

                var parts = line.Split('\t');

                var item = items[lineNumber - 1];

                Array.Copy(parts.Select(p => double.Parse(p, CultureInfo.InvariantCulture)).ToArray(), item.Factors3d, 3);
            }
        }

        FullTextIndex.AddRangeAsync(labeledItems.ToList<dynamic>()).Wait();
    }
}
